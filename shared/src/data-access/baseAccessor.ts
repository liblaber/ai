import type { Table } from '../types';

export abstract class BaseAccessor {
  static isAccessor(_databaseUrl: string): boolean {
    return false;
  }

  abstract executeQuery(query: string, params?: string[]): Promise<any[]>;
  abstract guardAgainstMaliciousQuery(query: string): void;
  abstract getSchema(): Promise<Table[]>;
  abstract initialize(databaseUrl: string): void | Promise<void>;
  abstract close(): Promise<void>;
}
