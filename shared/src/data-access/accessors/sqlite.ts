import { Database as SQLiteDatabase, open } from 'sqlite';
import sqlite3 from 'sqlite3';
import type { BaseAccessor } from '../baseAccessor';
import type { Table } from '../../types';

interface SQLiteColumn {
  name: string;
  type: string;
  pk: number;
  notnull: number;
}

interface TableInfo {
  table_name: string;
}

export class SQLiteAccessor implements BaseAccessor {
  readonly label = 'SQLite';
  private _db: SQLiteDatabase | null = null;

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

      // For each table, get its columns
      for (const table of tables) {
        const columns: SQLiteColumn[] = await this._db.all(`PRAGMA table_info(${table.table_name})`);
        result.push({
          tableName: table.table_name,
          columns: columns.map((col) => ({
            name: col.name,
            type: col.type.toLowerCase(),
            isPrimary: Boolean(col.pk),
            nullable: !col.notnull,
          })),
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
