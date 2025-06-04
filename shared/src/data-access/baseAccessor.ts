import type { Table } from '../types';

export interface BaseAccessor {
  executeQuery: (query: string, params?: string[]) => Promise<any[]>;
  guardAgainstMaliciousQuery: (query: string) => void;
  getSchema: () => Promise<Table[]>;
  testConnection: (databaseUrl: string) => Promise<boolean>;
  initialize: (databaseUrl: string) => void | Promise<void>;
  close: () => Promise<void>;
  readonly label: string;
}

export interface BaseAccessorConstructor {
  new (): BaseAccessor;
  isAccessor(databaseUrl: string): boolean;
}
