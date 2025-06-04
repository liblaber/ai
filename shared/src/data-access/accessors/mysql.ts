import type { BaseAccessor } from '../baseAccessor';
import type { Table } from '../../types';
import type { Connection } from 'mysql2/promise';
import mysql from 'mysql2/promise';

export class MySQLAccessor implements BaseAccessor {
  readonly label = 'MySQL';
  private _connection: Connection | null = null;

  static isAccessor(databaseUrl: string): boolean {
    return databaseUrl.startsWith('mysql://');
  }

  async testConnection(databaseUrl: string): Promise<boolean> {
    try {
      const connection = await mysql.createConnection(databaseUrl);
      await connection.query('SELECT 1');
      await connection.end();

      return true;
    } catch (error) {
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
    if (!this._connection) {
      throw new Error('Database connection not initialized. Please call initialize() first.');
    }

    try {
      const [tables] = await this._connection.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
      `);

      const result: Table[] = [];

      for (const table of tables as any[]) {
        const [columns] = await this._connection.query(
          `
          SELECT
            column_name as name,
            data_type as type,
            column_key = 'PRI' as isPrimary
          FROM information_schema.columns
          WHERE table_schema = DATABASE()
            AND table_name = ?
        `,
          [table.table_name],
        );

        result.push({
          tableName: table.table_name,
          columns: columns as any[],
        });
      }

      return result;
    } catch (error) {
      console.error('Error fetching DB schema:', error);
      throw new Error((error as Error)?.message);
    }
  }

  async initialize(databaseUrl: string): Promise<void> {
    if (this._connection) {
      await this.close();
    }

    this._connection = await mysql.createConnection(databaseUrl);
  }

  async close(): Promise<void> {
    if (this._connection) {
      await this._connection.end();
      this._connection = null;
    }
  }
}
