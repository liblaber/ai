import type { BaseAccessor } from '../baseAccessor';
import type { MySqlColumn, MySqlTable } from '../../types';
import type { Connection } from 'mysql2/promise';
import mysql from 'mysql2/promise';

// Configure type casting for numeric values
const typesToParse = ['INT', 'BIGINT', 'DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE', 'NEWDECIMAL'];

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
    } catch (error: any) {
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
      const result: MySqlTable[] = tables.map((table) => ({
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
              const enumValues = enumString.split(',').map((val: string) => val.trim().replace(/^'|'$/g, ''));
              column.enumValues = enumValues;
            }
          }

          return column;
        }),
      }));

      return result;
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

  async close(): Promise<void> {
    if (this._connection) {
      await this._connection.end();
      this._connection = null;
    }
  }
}
