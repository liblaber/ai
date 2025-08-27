import PluginManager from '~/lib/plugins/plugin-manager';
import type { BaseAccessor, BaseAccessorConstructor } from '@liblab/data-access/baseAccessor';
import { PostgresAccessor } from '@liblab/data-access/accessors/postgres';
import { MySQLAccessor } from '@liblab/data-access/accessors/mysql';
import { SQLiteAccessor } from '@liblab/data-access/accessors/sqlite';
import { MongoDBAccessor } from '@liblab/data-access/accessors/mongodb';
import { GoogleDocsAccessor } from '@liblab/data-access/accessors/google-docs';
import { GoogleSheetsAccessor } from '@liblab/data-access/accessors/google-sheets';
import { type DataAccessPluginId, PluginType } from '~/lib/plugins/types';

export class DataAccessPluginManager {
  static async isAvailable(type: string): Promise<boolean> {
    // Normalize type (e.g., 'postgresql' -> 'postgres')
    const normalized = type.replace('postgresql', 'postgres');
    const manager = PluginManager.getInstance();
    await manager.initialize();

    return manager.isPluginAvailable(PluginType.DATA_ACCESS, normalized as DataAccessPluginId);
  }

  static async getAccessor(databaseUrl: string): Promise<BaseAccessor> {
    const allAccessors: BaseAccessorConstructor[] = [
      PostgresAccessor,
      MySQLAccessor,
      SQLiteAccessor,
      MongoDBAccessor,
      GoogleDocsAccessor,
      GoogleSheetsAccessor,
    ];

    // Only allow accessors that are enabled by the plugin manager
    const enabledAccessors = [];

    for (const acc of allAccessors) {
      // Use static pluginId if present, otherwise infer from label
      const pluginId = acc.pluginId || new acc().label.toLowerCase().replace(/\s.*/, '');
      const isAvailable = await DataAccessPluginManager.isAvailable(pluginId);

      if (isAvailable) {
        enabledAccessors.push(acc);
      }
    }

    const accessorClass = enabledAccessors.find((acc: BaseAccessorConstructor) => acc.isAccessor(databaseUrl));

    if (!accessorClass) {
      throw new Error(`No accessor found for database URL: ${databaseUrl}`);
    }

    return new accessorClass();
  }

  static getAccessorPluginId(databaseUrl: string): DataAccessPluginId {
    const allAccessors: BaseAccessorConstructor[] = [
      PostgresAccessor,
      MySQLAccessor,
      SQLiteAccessor,
      MongoDBAccessor,
      GoogleDocsAccessor,
      GoogleSheetsAccessor,
    ];

    const accessorClass = allAccessors.find((acc: BaseAccessorConstructor) => acc.isAccessor(databaseUrl));

    if (!accessorClass) {
      throw new Error(`No accessor found for database URL: ${databaseUrl}`);
    }

    return accessorClass.pluginId as DataAccessPluginId;
  }

  static async getAvailableDatabaseTypes(): Promise<
    {
      value: string;
      label: string;
      connectionStringFormat: string;
      available: boolean;
    }[]
  > {
    const allAccessors: BaseAccessorConstructor[] = [
      PostgresAccessor,
      MySQLAccessor,
      SQLiteAccessor,
      MongoDBAccessor,
      GoogleDocsAccessor,
      GoogleSheetsAccessor,
    ];
    return Promise.all(
      allAccessors.map(async (acc) => {
        const instance = new acc();
        const pluginId = acc.pluginId || instance.label.toLowerCase().replace(/\s.*/, '');

        return {
          value: pluginId,
          label: instance.label,
          connectionStringFormat: instance.connectionStringFormat,
          available: await DataAccessPluginManager.isAvailable(pluginId),
        };
      }),
    );
  }

  static async getAvailableDataSourceTypes(): Promise<
    {
      pluginId: string;
      value: string;
      label: string;
      connectionStringFormat: string;
      available: boolean;
    }[]
  > {
    const allAccessors: BaseAccessorConstructor[] = [
      PostgresAccessor,
      MySQLAccessor,
      SQLiteAccessor,
      MongoDBAccessor,
      // GoogleDocsAccessor, // Hidden for now - needs more work
      GoogleSheetsAccessor,
    ];
    return Promise.all(
      allAccessors.map(async (acc) => {
        const instance = new acc();
        const pluginId = acc.pluginId || instance.label.toLowerCase().replace(/\s.*/, '');

        return {
          pluginId,
          value: pluginId,
          label: instance.label,
          connectionStringFormat: instance.connectionStringFormat,
          available: await DataAccessPluginManager.isAvailable(pluginId),
        };
      }),
    );
  }
}

// Keep the old name for backward compatibility
export { DataAccessPluginManager as DataSourcePluginManager };
