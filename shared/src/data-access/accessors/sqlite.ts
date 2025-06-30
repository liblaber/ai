import { Database as SQLiteDatabase, open } from 'sqlite';
import sqlite3 from 'sqlite3';
import type { BaseAccessor } from '../baseAccessor';
import type { Column, Table } from '../../types';
import { EXAMPLE_DB_ENUM_VALUES } from '../../utils/example-db-enum-values';

interface SQLiteColumn {
  name: string;
  type: string;
  pk: number;
  notnull: number;
}

interface TableInfo {
  table_name: string;
}

const EXAMPLE_DATABASE_NAME = 'example.db';

export class SQLiteAccessor implements BaseAccessor {
  static pluginId = 'sqlite';
  readonly label = 'SQLite';
  private _db: SQLiteDatabase | null = null;

  readonly connectionStringFormat = 'sqlite://path/to/database.db';

  static isAccessor(databaseUrl: string): boolean {
    return databaseUrl.startsWith('sqlite://');
  }

  async testConnection(databaseUrl: string): Promise<boolean> {
    try {
      const db = await this._createConnection(databaseUrl);
      await db.get('SELECT 1');
      await db.close();

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
      return await this._db.all(query, params);
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
      const tables: TableInfo[] = await this._db.all(
        `SELECT name as table_name
         FROM sqlite_master
         WHERE type='table'
         AND name NOT LIKE 'sqlite_%'
         ORDER BY name`,
      );

      const result: Table[] = [];

      const isExampleDatabase = this._db.config.filename === EXAMPLE_DATABASE_NAME;

      // For each table, get its columns
      for (const table of tables) {
        const columns: SQLiteColumn[] = await this._db.all(`PRAGMA table_info(${table.table_name})`);
        result.push({
          tableName: table.table_name,
          columns: columns.map((col) => {
            const column = {
              name: col.name,
              type: col.type.toLowerCase(),
              isPrimary: Boolean(col.pk),
              nullable: !col.notnull,
            } as Column;

            // Only add enum values if this is an example database
            if (isExampleDatabase) {
              column.enumValues = EXAMPLE_DB_ENUM_VALUES[table.table_name]?.[col.name];
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

  private async _createConnection(databaseUrl: string): Promise<SQLiteDatabase> {
    const filename = databaseUrl.startsWith('sqlite://') ? databaseUrl.replace('sqlite://', '') : databaseUrl;

    return open({
      filename,
      driver: sqlite3.Database,
    });
  }

  async initialize(databaseUrl: string): Promise<void> {
    if (this._db) {
      await this.close();
    }

    this._db = await this._createConnection(databaseUrl);
  }

  async close(): Promise<void> {
    if (this._db) {
      await this._db.close();
      this._db = null;
    }
  }
}
