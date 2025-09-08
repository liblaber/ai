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
import { GoogleSheetsAccessor } from '@liblab/data-access/accessors/google-sheets';
import { GoogleDocsAccessor } from '@liblab/data-access/accessors/google-docs';

export class DataSourcePluginManager {
  static async isAvailable(type: string): Promise<boolean> {
    // Normalize type (e.g., 'postgresql' -> 'postgres')
    const normalized = type.replace('postgresql', 'postgres');

    const manager = PluginManager.getInstance();
    await manager.initialize();

    return manager.isPluginAvailable(PluginType.DATA_ACCESS, normalized as DataAccessPluginId);
  }

  static async getAccessor(dataSourceType: DataSourceType): Promise<BaseAccessor> {
    const accessor = DataAccessor.getAccessor(dataSourceType);
    const isAvailable = await this.isAvailable(dataSourceType);

    if (!accessor || !isAvailable) {
      throw new Error(`No accessor found for type: ${dataSourceType}`);
    }

    return accessor;
  }

  static async getAccessorPluginId(type: DataSourceType): Promise<DataAccessPluginId> {
    return (await DataAccessor.getAccessor(type)).pluginId;
  }

  static async getAvailableDataSourceTypes(): Promise<DataSourceDescriptor[]> {
    const allAccessors = [
      PostgresAccessor,
      MySQLAccessor,
      SQLiteAccessor,
      MongoDBAccessor,
      HubspotAccessor,
      GoogleDocsAccessor,
      GoogleSheetsAccessor,
    ];

    return Promise.all([
      ...allAccessors.map(async (acc) => {
        const instance = new acc();

        return {
          value: instance.pluginId,
          label: instance.label,
          type: instance.dataSourceType,
          properties: instance.getRequiredDataSourcePropertyDescriptors(),
          available: await DataSourcePluginManager.isAvailable(instance.pluginId),
        };
      }),
    ]);
  }
}
