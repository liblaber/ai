import { type BaseAccessor } from './baseAccessor';
import { PostgresAccessor } from './accessors/postgres';
import { MySQLAccessor } from './accessors/mysql';
import { SQLiteAccessor } from './accessors/sqlite';
import { MongoDBAccessor } from './accessors/mongodb';
import { DataSourceType } from './utils/types';
import type { BaseDatabaseAccessor } from './baseDatabaseAccessor';
import { HubspotAccessor } from './accessors/hubspot';
import { GoogleSheetsAccessor } from './accessors/google-sheets';
import { GoogleDocsAccessor } from './accessors/google-docs';

export class DataAccessor {
  static getDatabaseAccessor(type: DataSourceType): BaseDatabaseAccessor {
    switch (type.toUpperCase()) {
      case DataSourceType.POSTGRES:
        return new PostgresAccessor();
      case DataSourceType.MYSQL:
        return new MySQLAccessor();
      case DataSourceType.SQLITE:
        return new SQLiteAccessor();
      case DataSourceType.MONGODB:
        return new MongoDBAccessor();
      case DataSourceType.GOOGLE_SHEETS:
        return new GoogleSheetsAccessor();
      case DataSourceType.GOOGLE_DOCS:
        return new GoogleDocsAccessor();
      default:
        throw new Error(`No database accessor found for type: ${type}`);
    }
  }

  static async getAccessor(type: DataSourceType): Promise<BaseAccessor> {
    switch (type.toUpperCase()) {
      case DataSourceType.POSTGRES:
      case DataSourceType.MYSQL:
      case DataSourceType.SQLITE:
      case DataSourceType.MONGODB:
      case DataSourceType.GOOGLE_SHEETS:
      case DataSourceType.GOOGLE_DOCS:
        return this.getDatabaseAccessor(type);
      case DataSourceType.HUBSPOT:
        return new HubspotAccessor();
      default:
        throw new Error(`No accessor found for type: ${type}`);
    }
  }

  static async getDataSourceLabel(type: DataSourceType): Promise<string> {
    if (this._cachedTypeLabels.has(type)) {
      return this._cachedTypeLabels.get(type)!;
    }

    const accessor = await this.getAccessor(type);

    this._cachedTypeLabels.set(type, accessor.label);

    return accessor.label;
  }

  static _cachedTypeLabels: Map<DataSourceType, string> = new Map<DataSourceType, string>();
}
