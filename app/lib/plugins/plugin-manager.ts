import { env } from '~/lib/config/env';
import {
  type AuthPluginId,
  type DataAccessPluginId,
  type PluginAccessMap,
  type PluginId,
  PluginType,
  type StarterPluginId,
} from '~/lib/plugins/types';

export const FREE_PLUGIN_ACCESS: PluginAccessMap = {
  [PluginType.DATA_ACCESS]: {
    postgres: true,
    mysql: false,
    sqlite: true,
  },
  [PluginType.AUTH]: {
    anonymous: true,
    google: false,
    twitch: false,
    twitter: false,
  },
  [PluginType.STARTER]: {
    remix: true,
    next: true,
  },
};

export const PREMIUM_PLUGIN_ACCESS = {
  [PluginType.DATA_ACCESS]: {
    postgres: true,
    mysql: true,
    sqlite: true,
  },
  [PluginType.AUTH]: {
    anonymous: false,
    google: true,
    twitch: true,
    twitter: true,
  },
  [PluginType.STARTER]: {
    remix: true,
    next: true,
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

  isPluginAvailable(pluginType: PluginType, pluginId: PluginId): boolean {
    if (pluginType === PluginType.DATA_ACCESS) {
      return this._pluginAccess[pluginType][pluginId as DataAccessPluginId];
    } else if (pluginType === PluginType.AUTH) {
      return this._pluginAccess[pluginType][pluginId as AuthPluginId];
    } else if (pluginType === PluginType.STARTER) {
      return this._pluginAccess[pluginType][pluginId as StarterPluginId];
    }

    return false;
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
