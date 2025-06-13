import { type SSLMode } from '~/types/database';

export interface ParsedConnectionString {
  type: string;
  username: string;
  password: string;
  hostname: string;
  port: number;
  pathname: string;
  database: string;
  sslMode: SSLMode;
}

export class DatabaseConnectionParser {
  private _parsed: ParsedConnectionString;

  private constructor(connectionString: string) {
    this._parsed = this._parseConnectionString(connectionString);
  }

  private _parseConnectionString(connectionString: string): ParsedConnectionString {
    try {
      const url = new URL(connectionString);
      const type = url.protocol.replace(':', '');
      const sslMode = (url.searchParams.get('sslmode')?.toUpperCase() || 'DISABLE') as SSLMode;

      if (!url.hostname) {
        throw new Error('Hostname is required');
      }

      if (!url.username) {
        throw new Error('Username is required');
      }

      if (!url.password) {
        throw new Error('Password is required');
      }

      if (!url.pathname) {
        throw new Error('Database name is required');
      }

      if (!url.port) {
        throw new Error('Port is required');
      }

      return {
        type,
        username: url.username,
        password: url.password,
        hostname: url.hostname,
        port: parseInt(url.port, 10),
        pathname: url.pathname,
        database: url.pathname.slice(1),
        sslMode,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Invalid connection string format');
    }
  }

  parse(): ParsedConnectionString {
    return {
      type: this._parsed.type,
      username: this._parsed.username,
      password: this._parsed.password,
      hostname: this._parsed.hostname,
      port: this._parsed.port,
      pathname: this._parsed.pathname,
      database: this._parsed.database,
      sslMode: this._parsed.sslMode,
    };
  }

  static parse(connectionString: string): ParsedConnectionString {
    const parser = new DatabaseConnectionParser(connectionString);
    return parser.parse();
  }

  static validate(connectionString: string): void {
    new DatabaseConnectionParser(connectionString);
  }
}
