import { BaseAccessor } from '../baseAccessor';
import type { Table } from '../../types';
import Database from 'better-sqlite3';
import type { Database as SQLiteDatabase } from 'better-sqlite3';

interface SqliteTable {
  tableName: string;
}

interface SqliteColumn {
  name: string;
  type: string;
  pk: number;
}

export class SqliteAccessor extends BaseAccessor {
  private _db: SQLiteDatabase | null = null;

  static override isAccessor(_databaseUrl: string): boolean {
    return _databaseUrl.endsWith('.db') || _databaseUrl.endsWith('.sqlite') || _databaseUrl.endsWith('.sqlite3');
  }

  async executeQuery(query: string, params?: string[]): Promise<any[]> {
    if (!this._db) {
      throw new Error('Database connection not initialized. Call initialize() first.');
    }

    try {
      const result = params ? this._db.prepare(query).all(params) : this._db.prepare(query).all();
      return result;
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
    if (!this._db) {
      throw new Error('Database connection not initialized. Call initialize() first.');
    }

    try {
      // Get all tables
      const tables = this._db
        .prepare<[], SqliteTable>(
          `
        SELECT name as tableName
        FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `,
        )
        .all() as SqliteTable[];

      const result: Table[] = [];

      // For each table, get its columns
      for (const table of tables) {
        const columns = this._db
          .prepare<[string], SqliteColumn>(
            `
          PRAGMA table_info(?)
        `,
          )
          .all(table.tableName) as SqliteColumn[];

        const tableColumns = columns.map((col) => ({
          name: col.name,
          type: col.type,
          isPrimary: col.pk === 1,
        }));

        result.push({
          tableName: table.tableName,
          columns: tableColumns,
        });
      }

      return result;
    } catch (error) {
      console.error('Error fetching DB schema:', error);
      throw new Error((error as Error)?.message);
    }
  }

  async initialize(databaseUrl: string): Promise<void> {
    if (this._db) {
      await this.close();
    }

    this._db = new Database(databaseUrl);
  }

  async close(): Promise<void> {
    if (this._db) {
      this._db.close();
      this._db = null;
    }
  }
}
