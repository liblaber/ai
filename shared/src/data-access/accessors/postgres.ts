import { Pool, types } from 'pg';
import { type Table } from '../../types';
import { format } from 'sql-formatter';
import { BaseDatabaseAccessor } from '../baseDatabaseAccessor';
import { type DataAccessPluginId, type DataSourceProperty, DataSourceType } from '../utils/types';
import type { BaseAccessor } from '../baseAccessor';

const typesToParse = [types.builtins.INT4, types.builtins.INT8, types.builtins.NUMERIC];
typesToParse.forEach((type) => {
  types.setTypeParser(type, (value: any) => parseFloat(value));
});

export class PostgresAccessor extends BaseDatabaseAccessor implements BaseAccessor {
  readonly dataSourceType: DataSourceType = DataSourceType.POSTGRES;

  readonly pluginId: DataAccessPluginId = 'postgres';
  readonly label = 'PostgreSQL';
  readonly preparedStatementPlaceholderExample = '$1, $2, $3';
  readonly connectionStringFormat = 'postgres(ql)://username:password@host:port/database';
  private _pool: Pool | null = null;

  async testConnection(dataSourceProperties: DataSourceProperty[]): Promise<boolean> {
    const connectionString = this.getConnectionStringFromProperties(dataSourceProperties);
    const pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 60000,
      max: 10,
      ssl: {
        rejectUnauthorized:
          connectionString.toLowerCase().includes('sslmode=verify-full') ||
          connectionString.includes('sslmode=verify-ca'),
      },
    });

    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      await pool.end();

      return true;
    } catch {
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
      console.error('Error executing query:', JSON.stringify(error));
      throw new Error((error as Error)?.message);
    }
  }

  validateProperties(dataSourceProperties: DataSourceProperty[]): void {
    const connectionString = this.getConnectionStringFromProperties(dataSourceProperties);

    const regex = /^postgres(?:ql)?:\/\/([a-zA-Z0-9_-]+):(.+)@([a-zA-Z0-9.-]+):([0-9]{1,5})\/([a-zA-Z0-9_-]+)(\?.*)?$/;
    const match = connectionString.match(regex);

    if (!match) {
      throw new Error('Invalid connection string');
    }

    const port = parseInt(match[4], 10);

    if (port < 1 || port > 65535) {
      throw new Error('Port has to be in range from 1 to 65535');
    }
  }

  guardAgainstMaliciousQuery(query: string): void {
    if (!query) {
      throw new Error('No SQL query provided. Please provide a valid SQL query to execute.');
    }

    const normalizedQuery = query.trim().toUpperCase();

    const forbiddenKeywords = ['DROP ', 'TRUNCATE ', 'ALTER ', 'CREATE ', 'GRANT ', 'REVOKE '];

    if (forbiddenKeywords.some((keyword) => normalizedQuery.includes(keyword))) {
      throw new Error('Query contains forbidden SQL keywords');
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
        rejectUnauthorized:
          databaseUrl.toLowerCase().includes('sslmode=verify-full') || databaseUrl.includes('sslmode=verify-ca'),
      },
    });
  }

  generateSampleSchema(): Table[] {
    return [
      {
        tableName: 'users',
        columns: [
          { name: 'id', type: 'integer', isPrimary: true },
          { name: 'name', type: 'varchar', isPrimary: false },
          { name: 'email', type: 'varchar', isPrimary: false },
          { name: 'role', type: 'varchar', isPrimary: false },
          { name: 'created_at', type: 'timestamp', isPrimary: false },
        ],
      },
      {
        tableName: 'orders',
        columns: [
          { name: 'id', type: 'integer', isPrimary: true },
          { name: 'user_id', type: 'integer', isPrimary: false },
          { name: 'amount', type: 'decimal', isPrimary: false },
          { name: 'status', type: 'varchar', isPrimary: false },
          { name: 'created_at', type: 'timestamp', isPrimary: false },
        ],
      },
    ];
  }

  formatQuery(query: string): string {
    try {
      return format(query, { language: 'postgresql' });
    } catch {
      // If formatting fails, return as-is
      return query;
    }
  }

  generateSystemPrompt(
    databaseType: string,
    dbSchema: string,
    existingQueries: string[] | undefined,
    userPrompt: string,
  ): string {
    return `You are a SQL expert tasked with generating SQL queries based on a given database schema and user requirements.
Your goal is to create accurate, optimized queries that address the user's request while adhering to specific guidelines and output format.

You will be working with the following database type:
<databaseType>
${databaseType}
</databaseType>

Here is the database schema you should use:
<dbSchema>
${dbSchema}
</dbSchema>

${existingQueries ? `Here are the existing SQL queries used by the app the user is building. Use them as context if they need to be updated to fulfill the user's request: <existing_sql_queries>${existingQueries}</existing_sql_queries>` : ''}

To generate the SQL queries, follow these steps:
1. Carefully analyze the user's request and the provided database schema.
2. Create one or more SQL queries that accurately address the user's requirements.
3. Ensure the queries are compatible with the specified database type.
4. Prefer simple SQL syntax without relying heavily on database-specific functions.
5. Do not use any DDL (Data Definition Language) statements such as CREATE, ALTER, or DROP. Only DML (Data Manipulation Language) queries like SELECT, INSERT, UPDATE, and DELETE are allowed.
6. Use appropriate table joins if necessary.
7. Optimize the queries for performance.
8. Avoid using any tables or columns not present in the schema.
9. If needed, parametrize the query using positional placeholders like ${this.preparedStatementPlaceholderExample}.
10. Use the exact format and casing for explicit values in the query (e.g., use "SUPER_ADMIN" if values are {ADMIN, MEMBER, SUPER_ADMIN}).
11. Provide a brief explanation for each query.
12. Specify the response schema for each query, including selected column types and any explicit values, if present.

Format your response as a JSON array containing objects with the following structure:
{
  "query": "Your SQL query here",
  "explanation": "A brief explanation of what the query does",
  "responseSchema": "column_name1 (data_type), column_name2 (data_type), ..."
}

Here's an example of a valid response:
[
  {
    "query": "SELECT u.name, u.email, u.role FROM users u WHERE u.role = 'ADMIN'",
    "explanation": "Retrieves names and email addresses of all admin users",
    "responseSchema": "name (text), email (text), role (text, {ADMIN,MEMBER,SUPER_ADMIN})"
  },
  {
    "query": "SELECT COUNT(*) as total_users FROM users",
    "explanation": "Counts the total number of users in the system",
    "responseSchema": "total_users (bigint)"
  },
  {
    "query": "SELECT b.build_number, b.start_time, b.end_time, b.status FROM builds b WHERE b.status IN ($1) AND b.api_id = $2",
    "explanation": "Retrieves all the builds for specific statuses and API",
    "responseSchema": "build_number (numeric), start_time (timestamp), end_time (timestamp), status (text, {SUCCESS,IN_PROGRESS,FAILURE})"
  }
]

IMPORTANT: Your output should consist ONLY of the JSON array containing the query objects. Do not include any additional text or explanations outside of this JSON structure.
IMPORTANT: Do not add additional formatting or characters to the query itself like \\n or \\t, just output plain text SQL query.

Now, generate SQL queries based on the following user request:
<userRequest>
${userPrompt}
</userRequest>`;
  }

  async close(): Promise<void> {
    if (this._pool) {
      await this._pool.end();
      this._pool = null;
    }
  }
}
