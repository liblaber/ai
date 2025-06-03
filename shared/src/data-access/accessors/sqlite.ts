import type { BaseAccessor } from '../baseAccessor';
import type { Table } from '../../types';
import Database from 'better-sqlite3';

interface SqliteTable {
  tableName: string;
}

interface SqliteColumn {
  name: string;
  type: string;
  pk: number;
}

const accessor: BaseAccessor = {
  async executeQuery(databaseUrl: string, query: string, params?: string[]): Promise<any[]> {
    const db = new Database(databaseUrl);

    try {
      const result = params ? db.prepare(query).all(params) : db.prepare(query).all();
      return result;
    } finally {
      db.close();
    }
  },

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
  },

  async getSchema(databaseUrl: string): Promise<Table[]> {
    const db = new Database(databaseUrl);

    try {
      // Get all tables
      const tables = db
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
        const columns = db
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
    } finally {
      db.close();
    }
  },

  isAccessor(databaseUrl: string): boolean {
    return databaseUrl.endsWith('.db') || databaseUrl.endsWith('.sqlite') || databaseUrl.endsWith('.sqlite3');
  },
};

export default accessor;
