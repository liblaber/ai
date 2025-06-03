import { BaseAccessor } from './baseAccessor';
import { PostgresAccessor } from './accessors/postgres';
import { SqliteAccessor } from './accessors/sqlite';

export class DataAccessor {
  static getAccessor(databaseUrl: string): BaseAccessor {
    const allAccessors = [PostgresAccessor, SqliteAccessor];

    const AccessorClass = allAccessors.find((Accessor) => Accessor.isAccessor(databaseUrl));

    if (!AccessorClass) {
      throw new Error(`No accessor found for database URL: ${databaseUrl}`);
    }

    return new AccessorClass();
  }
}
