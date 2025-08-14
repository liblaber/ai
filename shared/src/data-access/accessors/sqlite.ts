import type { Database as SQLiteDatabase } from 'better-sqlite3';
import Database from 'better-sqlite3';
import type { BaseAccessor } from '../baseAccessor';
import { type Column, type Table } from '../../types';
import { SAMPLE_DB_ENUM_VALUES } from '../../constants/sample-db-enum-values';
import { format } from 'sql-formatter';

interface SQLiteColumn {
  name: string;
  type: string;
  pk: number;
  notnull: number;
}

interface TableInfo {
  table_name: string;
}

export const SAMPLE_DATABASE_NAME = 'sample.db';

export class SQLiteAccessor implements BaseAccessor {
  static pluginId: string = 'sqlite';
  readonly label = 'SQLite';
  readonly preparedStatementPlaceholderExample = '?';
  readonly connectionStringFormat = 'sqlite://path/to/database.db';
  private _db: SQLiteDatabase | null = null;

  static isAccessor(databaseUrl: string): boolean {
    return databaseUrl.startsWith('sqlite://');
  }

  async testConnection(databaseUrl: string): Promise<boolean> {
    try {
      const db = await this._createConnection(databaseUrl);
      db.exec('SELECT 1');
      db.close();

      return true;
    } catch {
      return false;
    }
  }

  async executeQuery(query: string, params?: string[]): Promise<any[]> {
    if (!this._db) {
      throw new Error('Database connection not initialized. Please call initialize() first.');
    }

    try {
      const statement = this._db.prepare(query);

      // Sqlite uses `all` method for read queries and `run` method for create/update/delete queries
      if (statement.reader) {
        return statement.all(...(params ?? []));
      }

      return [statement.run(...(params ?? []))];
    } catch (error) {
      console.error('Error executing SQLite query:', error);
      throw new Error((error as Error)?.message || 'Failed to execute SQLite query');
    }
  }

  validate(connectionString: string): void {
    const regex = /^sqlite:\/\/(.*)$/;

    if (!regex.test(connectionString)) {
      throw new Error('Invalid connection string');
    }
  }

  guardAgainstMaliciousQuery(query: string): void {
    if (!query) {
      throw new Error('No SQL query provided. Please provide a valid SQL query to execute.');
    }

    const normalizedQuery = query.trim().toUpperCase();

    const forbiddenKeywords = ['DROP ', 'TRUNCATE ', 'ALTER ', 'CREATE ', 'GRANT ', 'REVOKE '];

    if (forbiddenKeywords.some((keyword) => normalizedQuery.includes(keyword))) {
      throw new Error('SQL query contains forbidden keywords');
    }
  }

  async getSchema(): Promise<Table[]> {
    if (!this._db) {
      throw new Error('Database connection not initialized. Please call initialize() first.');
    }

    try {
      // Get all tables
      const tables: TableInfo[] = await this._db
        .prepare<unknown[], TableInfo>(
          `SELECT name as table_name
         FROM sqlite_master
         WHERE type='table'
         AND name NOT LIKE 'sqlite_%'
         ORDER BY name`,
        )
        .all();

      const result: Table[] = [];

      const isSampleDatabase = this._db.name === SAMPLE_DATABASE_NAME;

      // For each table, get its columns
      for (const table of tables) {
        const columns: SQLiteColumn[] = this._db.pragma(
          `table_info("${table.table_name.replace(/"/g, '""')}")`,
        ) as SQLiteColumn[];
        result.push({
          tableName: table.table_name,
          columns: columns.map((col) => {
            const column = {
              name: col.name,
              type: col.type.toLowerCase(),
              isPrimary: Boolean(col.pk),
              nullable: !col.notnull,
            } as Column;

            // Only add enum values if this is the sample database
            if (isSampleDatabase) {
              column.enumValues = SAMPLE_DB_ENUM_VALUES[table.table_name]?.[col.name];
            }

            return column;
          }),
        });
      }

      return result;
    } catch (error) {
      console.error('Error fetching database schema:', error);
      throw new Error((error as Error)?.message);
    }
  }

  async initialize(databaseUrl: string): Promise<void> {
    if (this._db) {
      await this.close();
    }

    this._db = await this._createConnection(databaseUrl);
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
      return format(query, { language: 'sqlite' });
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
    if (this._db) {
      await this._db.close();
      this._db = null;
    }
  }

  private async _createConnection(databaseUrl: string): Promise<SQLiteDatabase> {
    const filename = databaseUrl.startsWith('sqlite://') ? databaseUrl.replace('sqlite://', '') : databaseUrl;

    return new Database(filename);
  }
}
