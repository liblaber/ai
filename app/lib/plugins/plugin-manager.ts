import { env } from '~/env';
import {
  type AuthPluginId,
  type DataAccessPluginId,
  type PluginAccessMap,
  type PluginId,
  PluginType,
  type StarterPluginId,
  type UserManagementPluginId,
} from '~/lib/plugins/types';

export const FREE_PLUGIN_ACCESS: PluginAccessMap = {
  [PluginType.DATA_ACCESS]: {
    postgres: true,
    mysql: true,
    sqlite: true,
    mongodb: true,
    hubspot: true,
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
  [PluginType.USER_MANAGEMENT]: {
    'single-user': true,
    'multi-user': false,
  },
};

export const PREMIUM_PLUGIN_ACCESS = {
  [PluginType.DATA_ACCESS]: {
    postgres: true,
    mysql: true,
    sqlite: true,
    mongodb: true,
    hubspot: true,
  },
  [PluginType.AUTH]: {
    anonymous: false,
    google: true,
    twitch: false,
    twitter: false,
  },
  [PluginType.STARTER]: {
    remix: true,
    next: true,
  },
  [PluginType.USER_MANAGEMENT]: {
    'single-user': true,
    'multi-user': true,
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
    } else if (pluginType === PluginType.USER_MANAGEMENT) {
      return this._pluginAccess[pluginType][pluginId as UserManagementPluginId];
    }

    return false;
  }

  getAccessMap(): PluginAccessMap {
    return { ...this._pluginAccess };
  }

  // Mock API call until we implement the backend
  private async _fetchPluginAccess(): Promise<PluginAccessMap> {
    const license = env.server.LICENSE_KEY;
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = env.server;

    // If license is free, only allow anonymous auth
    if (!license || license !== 'premium') {
      console.log('📋 Using FREE_PLUGIN_ACCESS');
      return FREE_PLUGIN_ACCESS;
    }

    // If license is premium but Google OAuth is not configured, fall back to free access
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.warn('Premium license detected but Google OAuth not configured. Falling back to free access.');
      console.log('📋 Falling back to FREE_PLUGIN_ACCESS');

      return FREE_PLUGIN_ACCESS;
    }

    // Premium license with Google OAuth configured - only allow Google auth
    console.log('📋 Using PREMIUM_PLUGIN_ACCESS');

    return PREMIUM_PLUGIN_ACCESS;
  }
}

export default PluginManager;
