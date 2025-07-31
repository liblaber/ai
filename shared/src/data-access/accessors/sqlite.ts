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
        const columns: SQLiteColumn[] = this._db.pragma(`table_info(${table.table_name})`) as SQLiteColumn[];
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
