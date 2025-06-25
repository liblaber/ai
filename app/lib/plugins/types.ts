export enum PluginType {
  DATA_ACCESS = 'data-access',
  AUTH = 'auth',
}

export type DataAccessPluginId = 'postgres' | 'mysql' | 'sqlite';
export type AuthPluginId = 'anonymous' | 'google' | 'twitch' | 'x';

export type PluginAccessMap = {
  [PluginType.DATA_ACCESS]: Record<DataAccessPluginId, boolean>;
  [PluginType.AUTH]: Record<AuthPluginId, boolean>;
};

export type PluginId = DataAccessPluginId | AuthPluginId;

export interface Plugin {
  pluginId: PluginId;
}
