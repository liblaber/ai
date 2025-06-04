import { Pool, types } from 'pg';
import type { BaseAccessor } from '../baseAccessor';
import type { Table } from '../../types';

const typesToParse = [types.builtins.INT4, types.builtins.INT8, types.builtins.NUMERIC];
typesToParse.forEach((type) => {
  types.setTypeParser(type, (value: any) => parseFloat(value));
});

export class PostgresAccessor implements BaseAccessor {
  readonly label = 'PostgreSQL';
  private _pool: Pool | null = null;

  static isAccessor(databaseUrl: string): boolean {
    return databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://');
  }

  async testConnection(databaseUrl: string): Promise<boolean> {
    const pool = new Pool({
      connectionString: databaseUrl,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 60000,
      max: 10,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      await pool.end();

      return true;
    } catch (error: any) {
      await pool.end();
      return false;
    }
  }

  async executeQuery(query: string, params?: string[]): Promise<any[]> {
    if (!this._pool) {
      throw new Error('Database connection not initialized. Please call initialize() first.');
    }

    try {
      const result = await this._pool!.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error executing query:', error);
      throw new Error((error as Error)?.message);
    }
  }

  guardAgainstMaliciousQuery(query: string): void {
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

  async getSchema(): Promise<Table[]> {
    if (!this._pool) {
      throw new Error('Database connection not initialized. Please call initialize() first.');
    }

    try {
      const query = `
        WITH table_info AS (SELECT t.table_name,
                                   c.column_name,
                                   c.data_type,
                                   c.udt_name,
                                   CASE
                                     WHEN pk.constraint_type = 'PRIMARY KEY' THEN true
                                     ELSE false
                                     END as is_primary_key
                            FROM information_schema.tables t
                                   JOIN
                                 information_schema.columns c
                                 ON t.table_name = c.table_name AND t.table_schema = c.table_schema
                                   LEFT JOIN (SELECT tc.table_name,
                                                     tc.table_schema,
                                                     ccu.column_name,
                                                     tc.constraint_type
                                              FROM information_schema.table_constraints tc
                                                     JOIN
                                                   information_schema.constraint_column_usage ccu
                                                   ON tc.constraint_name = ccu.constraint_name AND
                                                      tc.table_schema = ccu.table_schema
                                              WHERE tc.constraint_type = 'PRIMARY KEY') pk
                                             ON t.table_name = pk.table_name AND c.column_name = pk.column_name AND
                                                t.table_schema = pk.table_schema
                            WHERE t.table_schema = 'public'
                              AND t.table_type = 'BASE TABLE'
                            ORDER BY t.table_name,
                                     c.ordinal_position)
        SELECT ti.*,
               e.enum_values
        FROM table_info ti
               LEFT JOIN (SELECT t.typname                                       AS udt_name,
                                 array_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
                          FROM pg_type t
                                 JOIN
                               pg_enum e ON t.oid = e.enumtypid
                          GROUP BY t.typname) e ON ti.udt_name = e.udt_name;
      `;

      const result = await this._pool!.query(query);
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
    }
  }

  async initialize(databaseUrl: string): Promise<void> {
    if (this._pool) {
      await this.close();
    }

    this._pool = new Pool({
      connectionString: databaseUrl,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 60000,
      max: 10,
      ssl: {
        rejectUnauthorized: false,
      },
    });
  }

  async close(): Promise<void> {
    if (this._pool) {
      await this._pool.end();
      this._pool = null;
    }
  }
}
