import PluginManager from '~/lib/plugins/plugin-manager';
import type { BaseAccessor } from '@liblab/data-access/baseAccessor';
import { PostgresAccessor } from '@liblab/data-access/accessors/postgres';
import { MySQLAccessor } from '@liblab/data-access/accessors/mysql';
import { SQLiteAccessor } from '@liblab/data-access/accessors/sqlite';
import { MongoDBAccessor } from '@liblab/data-access/accessors/mongodb';
import { type DataAccessPluginId, PluginType } from '~/lib/plugins/types';
import { HubspotAccessor } from '@liblab/data-access/accessors/hubspot';
import type { DataSourceDescriptor, DataSourceType } from '@liblab/data-access/utils/types';
import { DataAccessor } from '@liblab/data-access/dataAccessor';

export class DataSourcePluginManager {
  static isAvailable(type: string): boolean {
    // Normalize type (e.g., 'postgresql' -> 'postgres')
    const normalized = type.replace('postgresql', 'postgres');
    return PluginManager.getInstance().isPluginAvailable(PluginType.DATA_ACCESS, normalized as DataAccessPluginId);
  }

  static getAccessor(dataSourceType: DataSourceType): BaseAccessor {
    const accessor = DataAccessor.getAccessor(dataSourceType);

    if (!accessor || !this.isAvailable(accessor.pluginId)) {
      throw new Error(`No accessor found for type: ${dataSourceType}`);
    }

    return accessor;
  }

  static getAccessorPluginId(type: DataSourceType): DataAccessPluginId {
    return DataAccessor.getAccessor(type).pluginId;
  }

  static getAvailableDatabaseTypes(): DataSourceDescriptor[] {
    const allAccessors = [PostgresAccessor, MySQLAccessor, SQLiteAccessor, MongoDBAccessor, HubspotAccessor];

    return allAccessors.map((acc) => {
      const instance = new acc();

      return {
        value: instance.pluginId,
        label: instance.label,
        type: instance.dataSourceType,
        properties: instance.getRequiredDataSourcePropertyDescriptors(),
        available: DataSourcePluginManager.isAvailable(instance.pluginId),
      };
    });
  }
}
