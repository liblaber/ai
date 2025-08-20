import { type BaseAccessor } from './baseAccessor';
import { PostgresAccessor } from './accessors/postgres';
import { MySQLAccessor } from './accessors/mysql';
import { SQLiteAccessor } from './accessors/sqlite';
import { MongoDBAccessor } from './accessors/mongodb';
import { DataSourceType } from './utils/types';
import type { BaseDatabaseAccessor } from './baseDatabaseAccessor';
import { HubspotAccessor } from './accessors/hubspot';

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
      default:
        throw new Error(`No database accessor found for type: ${type}`);
    }
  }

  static getAccessor(type: DataSourceType): BaseAccessor {
    switch (type.toUpperCase()) {
      case DataSourceType.POSTGRES:
      case DataSourceType.MYSQL:
      case DataSourceType.SQLITE:
      case DataSourceType.MONGODB:
        return this.getDatabaseAccessor(type);
      case DataSourceType.HUBSPOT:
        return new HubspotAccessor();
      default:
        throw new Error(`No accessor found for type: ${type}`);
    }
  }
}
