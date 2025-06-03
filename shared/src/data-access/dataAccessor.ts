import type { BaseAccessor } from './baseAccessor';
import postgres from './accessors/postgres';
import sqlite from './accessors/sqlite';

export class DataAccessor {
  static getAccessor(databaseUrl: string): BaseAccessor {
    const allAccessors = [postgres, sqlite];

    const accessor = allAccessors.find((acc) => acc.isAccessor(databaseUrl));

    if (!accessor) {
      throw new Error(`No accessor found for database URL: ${databaseUrl}`);
    }

    return accessor;
  }
}
