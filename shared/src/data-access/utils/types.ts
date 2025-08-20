export interface Plugin {
  pluginId: string;
}

export type DataAccessPluginId = 'postgres' | 'mysql' | 'sqlite' | 'mongodb' | 'hubspot';

export enum DataSourcePropertyType {
  CONNECTION_URL = 'CONNECTION_URL',
  ACCESS_TOKEN = 'ACCESS_TOKEN',
}

export enum DataSourceType {
  POSTGRES = 'POSTGRES',
  MYSQL = 'MYSQL',
  SQLITE = 'SQLITE',
  HUBSPOT = 'HUBSPOT',
  MONGODB = 'MONGODB',
}

export type DataSourceProperty = {
  type: DataSourcePropertyType;
  value: string;
};

export type DataSourcePropertyDescriptor = {
  type: DataSourcePropertyType;
  label: string;
  format: string;
};

export interface DataSourceDescriptor {
  value: string;
  label: string;
  type: DataSourceType;
  properties: DataSourcePropertyDescriptor[];
  available: boolean;
}
