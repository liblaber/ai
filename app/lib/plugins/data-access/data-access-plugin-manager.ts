import PluginManager from '~/lib/plugins/plugin-manager';
import type { BaseAccessor, BaseAccessorConstructor } from '@liblab/data-access/baseAccessor';
import { PostgresAccessor } from '@liblab/data-access/accessors/postgres';
import { MySQLAccessor } from '@liblab/data-access/accessors/mysql';
import { SQLiteAccessor } from '@liblab/data-access/accessors/sqlite';
import { MongoDBAccessor } from '@liblab/data-access/accessors/mongodb';
import { type DataAccessPluginId, PluginType } from '~/lib/plugins/types';

export class DataSourcePluginManager {
  static isAvailable(type: string): boolean {
    // Normalize type (e.g., 'postgresql' -> 'postgres')
    const normalized = type.replace('postgresql', 'postgres');
    return PluginManager.getInstance().isPluginAvailable(PluginType.DATA_ACCESS, normalized as DataAccessPluginId);
  }

  static getAccessor(databaseUrl: string): BaseAccessor {
    const allAccessors: BaseAccessorConstructor[] = [PostgresAccessor, MySQLAccessor, SQLiteAccessor, MongoDBAccessor];

    // Only allow accessors that are enabled by the plugin manager
    const enabledAccessors = allAccessors.filter((acc: BaseAccessorConstructor) => {
      // Use static pluginId if present, otherwise infer from label
      const pluginId = acc.pluginId || new acc().label.toLowerCase().replace(/\s.*/, '');
      return DataSourcePluginManager.isAvailable(pluginId);
    });

    const accessorClass = enabledAccessors.find((acc: BaseAccessorConstructor) => acc.isAccessor(databaseUrl));

    if (!accessorClass) {
      throw new Error(`No accessor found for database URL: ${databaseUrl}`);
    }

    return new accessorClass();
  }

  static getAccessorPluginId(databaseUrl: string): DataAccessPluginId {
    const allAccessors: BaseAccessorConstructor[] = [PostgresAccessor, MySQLAccessor, SQLiteAccessor];

    const accessorClass = allAccessors.find((acc: BaseAccessorConstructor) => acc.isAccessor(databaseUrl));

    if (!accessorClass) {
      throw new Error(`No accessor found for database URL: ${databaseUrl}`);
    }

    return accessorClass.pluginId as DataAccessPluginId;
  }

  static getAvailableDatabaseTypes(): {
    value: string;
    label: string;
    connectionStringFormat: string;
    available: boolean;
  }[] {
    const allAccessors: BaseAccessorConstructor[] = [PostgresAccessor, MySQLAccessor, SQLiteAccessor, MongoDBAccessor];
    return allAccessors.map((acc) => {
      const instance = new acc();
      const pluginId = acc.pluginId || instance.label.toLowerCase().replace(/\s.*/, '');

      return {
        value: pluginId,
        label: instance.label,
        connectionStringFormat: instance.connectionStringFormat,
        available: DataSourcePluginManager.isAvailable(pluginId),
      };
    });
  }
}
