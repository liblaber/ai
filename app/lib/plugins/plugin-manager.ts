import { env } from '~/lib/config/env';

export const DATA_ACCESS = 'data-access';
export const AUTH = 'auth';

export type PluginType = typeof DATA_ACCESS | typeof AUTH;

export type PluginId = DataAccessPluginId | AuthPluginId;

export type DataAccessPluginId = 'postgres' | 'mysql' | 'sqlite';
export type AuthPluginId = 'anonymous' | 'google' | 'twitch' | 'x';

export type PluginAccessMap = {
  [DATA_ACCESS]: Record<DataAccessPluginId, boolean>;
  [AUTH]: Record<AuthPluginId, boolean>;
};

export const FREE_PLUGIN_ACCESS: PluginAccessMap = {
  [DATA_ACCESS]: {
    postgres: true,
    mysql: false,
    sqlite: true,
  },
  [AUTH]: {
    anonymous: true,
    google: false,
    twitch: false,
    x: false,
  },
};

export const PREMIUM_PLUGIN_ACCESS = {
  [DATA_ACCESS]: {
    postgres: true,
    mysql: true,
    sqlite: true,
  },
  [AUTH]: {
    anonymous: true,
    google: true,
    twitch: true,
    x: true,
  },
};

class PluginManager {
  private static _instance: PluginManager;
  private _pluginAccess: PluginAccessMap = FREE_PLUGIN_ACCESS;
  private _initialized = false;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  static getInstance(): PluginManager {
    if (!PluginManager._instance) {
      PluginManager._instance = new PluginManager();
    }

    return PluginManager._instance;
  }

  async initialize(): Promise<void> {
    if (this._initialized) {
      return;
    }

    this._pluginAccess = await this._fetchPluginAccess();

    this._initialized = true;
  }

  isPluginAvailable(pluginType: typeof DATA_ACCESS, pluginId: DataAccessPluginId): boolean;
  isPluginAvailable(pluginType: typeof AUTH, pluginId: AuthPluginId): boolean;
  isPluginAvailable(pluginType: PluginType, pluginId: DataAccessPluginId | AuthPluginId): boolean {
    return (this._pluginAccess[pluginType] as any)[pluginId];
  }

  getAccessMap(): PluginAccessMap {
    return { ...this._pluginAccess };
  }

  // Mock API call until we implement the backend
  private async _fetchPluginAccess(): Promise<PluginAccessMap> {
    const license = env.LICENSE_KEY;

    if (!license || license !== 'premium') {
      return FREE_PLUGIN_ACCESS;
    }

    return PREMIUM_PLUGIN_ACCESS;
  }
}

export default PluginManager;
