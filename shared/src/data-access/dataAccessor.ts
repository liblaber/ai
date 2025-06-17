import type { BaseAccessor, BaseAccessorConstructor } from './baseAccessor';
import { PostgresAccessor } from './accessors/postgres';
import { MySQLAccessor } from './accessors/mysql';
import { SQLiteAccessor } from './accessors/sqlite';

export class DataAccessor {
  static getAccessor(databaseUrl: string): BaseAccessor {
    const allAccessors: BaseAccessorConstructor[] = [PostgresAccessor, MySQLAccessor, SQLiteAccessor];

    const accessorClass = allAccessors.find((acc: BaseAccessorConstructor) => acc.isAccessor(databaseUrl));

    if (!accessorClass) {
      throw new Error(`No accessor found for database URL: ${databaseUrl}`);
    }

    return new accessorClass();
  }

  static getAvailableDatabaseTypes(): { value: string; label: string }[] {
    const allAccessors: BaseAccessorConstructor[] = [PostgresAccessor, MySQLAccessor, SQLiteAccessor];
    return allAccessors.map((acc) => {
      const instance = new acc();
      return {
        value: instance.label.toLowerCase(),
        label: instance.label,
        connectionStringFormat: instance.connectionStringFormat,
      };
    });
  }
}
