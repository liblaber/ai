import type { Table } from '../types';

export interface BaseAccessor {
  executeQuery: (databaseUrl: string, query: string, params?: string[]) => Promise<any[]>;
  guardAgainstMaliciousQuery: (query: string) => void;
  getSchema: (databaseUrl: string) => Promise<Table[]>;

  isAccessor(databaseUrl: string): boolean;
}
