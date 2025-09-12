import { type MySqlColumn, type MySqlTable, type Table } from '../../types';
import type { Connection } from 'mysql2/promise';
import mysql from 'mysql2/promise';
import { format } from 'sql-formatter';
import { BaseDatabaseAccessor } from '../baseDatabaseAccessor';
import { type DataAccessPluginId, type DataSourceProperty, DataSourceType } from '../utils/types';

// Configure type casting for numeric values
const typesToParse = ['INT', 'BIGINT', 'DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE', 'NEWDECIMAL'];

export class MySQLAccessor extends BaseDatabaseAccessor {
  readonly dataSourceType: DataSourceType = DataSourceType.MYSQL;
  readonly pluginId: DataAccessPluginId = 'mysql';
  readonly label = 'MySQL';
  readonly connectionStringFormat = 'mysql://username:password@host:port/database';
  readonly preparedStatementPlaceholderExample = '?';
  private _connection: Connection | null = null;

  async testConnection(dataSourceProperties: DataSourceProperty[]): Promise<boolean> {
    try {
      const connectionString = this.getConnectionStringFromProperties(dataSourceProperties);
      const connection = await mysql.createConnection(connectionString);
      await connection.query('SELECT 1');
      await connection.end();

      return true;
    } catch {
      return false;
    }
  }

  async executeQuery(query: string, params?: string[]): Promise<any[]> {
    if (!this._connection) {
      throw new Error('Database connection not initialized. Please call initialize() first.');
    }

    try {
      const [rows] = await this._connection.query(query, params);
      return rows as any[];
    } catch (error) {
      console.error('Error executing query:', JSON.stringify(error));
      throw new Error((error as Error)?.message);
    }
  }

  validateProperties(dataSourceProperties: DataSourceProperty[]): void {
    const connectionString = this.getConnectionStringFromProperties(dataSourceProperties);
    const regex = /^mysql:\/\/([a-zA-Z0-9_-]+):(.+)@([a-zA-Z0-9.-]+):([0-9]{1,5})\/([a-zA-Z0-9_-]+)$/;
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

  async getSchema(): Promise<MySqlTable[]> {
    if (!this._connection) {
      throw new Error('Database connection not initialized. Please call initialize() first.');
    }

    // Query to get all tables with their comments
    const tablesQuery = `
    SELECT
      TABLE_NAME,
      TABLE_COMMENT
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME;
  `;

    // Query to get all columns with their details
    const columnsQuery = `
    SELECT
      c.TABLE_NAME,
      c.COLUMN_NAME,
      c.DATA_TYPE,
      c.COLUMN_TYPE,
      c.IS_NULLABLE,
      c.COLUMN_DEFAULT,
      c.COLUMN_COMMENT,
      c.COLUMN_KEY,
      c.EXTRA
    FROM INFORMATION_SCHEMA.COLUMNS c
    WHERE c.TABLE_SCHEMA = DATABASE()
    ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION;
  `;

    try {
      // Execute both queries
      const [tablesResult] = await this._connection.execute(tablesQuery);
      const [columnsResult] = await this._connection.execute(columnsQuery);

      const tables = tablesResult as any[];
      const columns = columnsResult as any[];

      // Group columns by table
      const columnsByTable = new Map<string, any[]>();
      columns.forEach((column) => {
        if (!columnsByTable.has(column.TABLE_NAME)) {
          columnsByTable.set(column.TABLE_NAME, []);
        }

        columnsByTable.get(column.TABLE_NAME)!.push(column);
      });

      // Build the result
      return tables.map((table) => ({
        tableName: table.TABLE_NAME,
        tableComment: table.TABLE_COMMENT || '',
        columns: (columnsByTable.get(table.TABLE_NAME) || []).map((col) => {
          const column: MySqlColumn = {
            name: col.COLUMN_NAME,
            type: col.DATA_TYPE,
            fullType: col.COLUMN_TYPE,
            nullable: col.IS_NULLABLE,
            defaultValue: col.COLUMN_DEFAULT,
            comment: col.COLUMN_COMMENT || '',
            isPrimary: col.COLUMN_KEY === 'PRI',
            extra: col.EXTRA || '',
          };

          // Extract enum values if the column type is ENUM
          if (col.DATA_TYPE === 'enum') {
            const enumMatch = col.COLUMN_TYPE.match(/enum\((.+)\)/i);

            if (enumMatch) {
              // Parse enum values, handling quoted strings properly
              const enumString = enumMatch[1];
              column.enumValues = enumString.split(',').map((val: string) => val.trim().replace(/^'|'$/g, ''));
            }
          }

          return column;
        }),
      }));
    } catch (error) {
      console.error('Error fetching database schema:', error);
      throw error;
    }
  }

  async initialize(databaseUrl: string): Promise<void> {
    if (this._connection) {
      await this.close();
    }

    this._connection = await mysql.createConnection({
      uri: databaseUrl,
      typeCast: (field, next) => {
        if (typesToParse.includes(field.type)) {
          const value = field.string();
          return value !== null ? parseFloat(value) : null;
        }

        return next();
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
      return format(query, { language: 'mysql' });
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
    "query": "SELECT b.build_number, b.start_time, b.end_time, b.status FROM builds b WHERE b.status IN (?) AND b.api_id = ?",
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
    if (this._connection) {
      await this._connection.end();
      this._connection = null;
    }
  }
}
