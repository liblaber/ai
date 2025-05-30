import pkg from 'pg';

const { Pool: dbPool } = pkg;
const types = pkg.types;

const typesToParse = [types.builtins.INT4, types.builtins.INT8, types.builtins.NUMERIC];
typesToParse.forEach((type) => {
  types.setTypeParser(type, (value: any) => parseFloat(value));
});

export interface Column {
  name: string;
  type: string;
  isPrimary: boolean;
  enumValues?: string[];
}

export interface Table {
  tableName: string;
  columns: Column[];
}

export async function getRemotePostgresSchema(connectionUrl: string): Promise<Table[]> {
  const pool = new dbPool({ connectionString: connectionUrl });

  try {
    const query = `
      WITH table_info AS (
        SELECT
          t.table_name,
          c.column_name,
          c.data_type,
          c.udt_name,
          CASE
            WHEN pk.constraint_type = 'PRIMARY KEY' THEN true
            ELSE false
            END as is_primary_key
        FROM
          information_schema.tables t
            JOIN
          information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
            LEFT JOIN (
            SELECT
              tc.table_name,
              tc.table_schema,
              ccu.column_name,
              tc.constraint_type
            FROM
              information_schema.table_constraints tc
                JOIN
              information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
            WHERE
              tc.constraint_type = 'PRIMARY KEY'
          ) pk ON t.table_name = pk.table_name AND c.column_name = pk.column_name AND t.table_schema = pk.table_schema
        WHERE
          t.table_schema = 'public' AND
          t.table_type = 'BASE TABLE'
        ORDER BY
          t.table_name,
          c.ordinal_position
      )
      SELECT
        ti.*,
        e.enum_values
      FROM
        table_info ti
          LEFT JOIN (
          SELECT
            t.typname AS udt_name,
            array_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
          FROM
            pg_type t
              JOIN
            pg_enum e ON t.oid = e.enumtypid
          GROUP BY
            t.typname
        ) e ON ti.udt_name = e.udt_name;
    `;

    const result = await pool.query(query);
    const tables: { [key: string]: Table } = {};

    for (const row of result.rows) {
      const {
        table_name: tableName,
        column_name: columnName,
        data_type: dataType,
        is_primary_key: isPrimaryKey,
        enum_values: rawEnumValues,
      } = row;

      if (!tables[tableName]) {
        tables[tableName] = { tableName, columns: [] };
      }

      tables[tableName].columns.push({
        name: columnName,
        type: dataType,
        isPrimary: isPrimaryKey,
        ...(rawEnumValues ? { enumValues: rawEnumValues } : {}),
      });
    }

    return Object.values(tables);
  } catch (error) {
    console.error('Error fetching DB schema:', error);
    throw new Error((error as Error)?.message);
  } finally {
    await pool.end();
  }
}

export async function executePostgresQuery(connectionUrl: string, query: string, params?: string[]): Promise<any[]> {
  guardAgainstMaliciousQuery(query);

  const pool = new dbPool({ connectionString: connectionUrl });

  try {
    const result = params && params.length > 0 ? await pool.query(query, params) : await pool.query(query);

    return result.rows;
  } catch (error) {
    console.error('Error executing query:', error);
    throw new Error((error as Error)?.message);
  } finally {
    await pool.end();
  }
}

function guardAgainstMaliciousQuery(query?: string) {
  if (!query) {
    throw new Error('No SQL query provided. Please provide a valid SQL query to execute.');
  }

  const normalizedQuery = query.trim().toUpperCase();

  if (!normalizedQuery.startsWith('SELECT') && !normalizedQuery.startsWith('WITH')) {
    throw new Error('SQL query must start with SELECT or WITH');
  }

  const forbiddenKeywords = [
    'INSERT ',
    'UPDATE ',
    'DELETE ',
    'DROP ',
    'TRUNCATE ',
    'ALTER ',
    'CREATE ',
    'GRANT ',
    'REVOKE ',
  ];

  if (forbiddenKeywords.some((keyword) => normalizedQuery.includes(keyword))) {
    throw new Error('SQL query contains forbidden keywords');
  }
}
