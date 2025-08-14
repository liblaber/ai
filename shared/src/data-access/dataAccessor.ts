import type { BaseAccessor, BaseAccessorConstructor } from './baseAccessor';
import { PostgresAccessor } from './accessors/postgres';
import { MySQLAccessor } from './accessors/mysql';
import { SQLiteAccessor } from './accessors/sqlite';
import { MongoDBAccessor } from './accessors/mongodb';
import type { Table } from '../types';

export class DataAccessor {
  private static _getAllAccessors(): BaseAccessorConstructor[] {
    return [PostgresAccessor, MySQLAccessor, SQLiteAccessor, MongoDBAccessor];
  }

  static getAccessor(databaseUrl: string): BaseAccessor {
    const allAccessors = this._getAllAccessors();

    const accessorClass = allAccessors.find((acc: BaseAccessorConstructor) => acc.isAccessor(databaseUrl));

    if (!accessorClass) {
      throw new Error(`No accessor found for database URL: ${databaseUrl}`);
    }

    return new accessorClass();
  }

  static getByDatabaseType(databaseType: string): BaseAccessor | null {
    const allAccessors = this._getAllAccessors();
    const accessorClass = allAccessors
      .sort((a, b) => b.pluginId.length - a.pluginId.length)
      .find((acc) => databaseType.toLowerCase().startsWith(acc.pluginId.toLowerCase()));

    if (!accessorClass) {
      return null;
    }

    return new accessorClass();
  }

  /**
   * Returns all available database types by reading the pluginId from all registered accessors
   * @returns Array of available database type strings
   */
  static getAvailableDatabaseTypes(): string[] {
    const allAccessors = this._getAllAccessors();
    return allAccessors.map((acc: BaseAccessorConstructor) => acc.pluginId);
  }

  /**
   * Gets a sample schema for the specified database type
   * @param databaseType - The database type to get sample schema for
   * @returns Sample schema or null if database type is not found
   */
  static getSampleSchema(databaseType: string): Table[] | null {
    const accessor = this.getByDatabaseType(databaseType);
    return accessor ? accessor.generateSampleSchema() : null;
  }
}
