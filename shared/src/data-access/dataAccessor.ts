import type { BaseAccessor, BaseAccessorConstructor } from './baseAccessor';
import { PostgresAccessor } from './accessors/postgres';
import { MySQLAccessor } from './accessors/mysql';
import { SQLiteAccessor } from './accessors/sqlite';
import { DataSourcePluginManager } from '~/lib/plugins/plugin-manager';

export class DataAccessor {
  static getAccessor(databaseUrl: string): BaseAccessor {
    const allAccessors: BaseAccessorConstructor[] = [PostgresAccessor, MySQLAccessor, SQLiteAccessor];

    // Only allow accessors that are enabled by the plugin manager
    const enabledAccessors = allAccessors.filter((acc: BaseAccessorConstructor) => {
      // Use static pluginId if present, otherwise infer from label
      const pluginId = (acc as any).pluginId || new acc().label.toLowerCase().replace(/\s.*/, '');
      return DataSourcePluginManager.isAvailable(pluginId);
    });

    const accessorClass = enabledAccessors.find((acc: BaseAccessorConstructor) => acc.isAccessor(databaseUrl));

    if (!accessorClass) {
      throw new Error(`No accessor found for database URL: ${databaseUrl}`);
    }

    return new accessorClass();
  }

  static getAvailableDatabaseTypes(): {
    value: string;
    label: string;
    connectionStringFormat: string;
    available: boolean;
  }[] {
    const allAccessors: BaseAccessorConstructor[] = [PostgresAccessor, MySQLAccessor, SQLiteAccessor];
    return allAccessors.map((acc) => {
      const instance = new acc();
      const pluginId = (acc as any).pluginId || instance.label.toLowerCase().replace(/\s.*/, '');

      return {
        value: pluginId,
        label: instance.label,
        connectionStringFormat: instance.connectionStringFormat,
        available: DataSourcePluginManager.isAvailable(pluginId),
      };
    });
  }
}
