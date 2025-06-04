import type { BaseAccessor, BaseAccessorConstructor } from './baseAccessor';
import { PostgresAccessor } from './accessors/postgres';
import { SqliteAccessor } from './accessors/sqlite';

export class DataAccessor {
  static getAccessor(databaseUrl: string): BaseAccessor {
    const allAccessors: BaseAccessorConstructor[] = [PostgresAccessor, SqliteAccessor];

    const accessorClass = allAccessors.find((Acc: BaseAccessorConstructor) => Acc.isAccessor(databaseUrl));

    if (!accessorClass) {
      throw new Error(`No accessor found for database URL: ${databaseUrl}`);
    }

    return new accessorClass();
  }
}
