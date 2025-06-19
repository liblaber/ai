import { env } from '~/lib/config/env';

// Centralized PluginManager
export type PluginType = 'data-access';

export type PluginAccessMap = Record<PluginType, Record<string, boolean>>;

class PluginManager {
  private static _instance: PluginManager;
  private _pluginAccess: PluginAccessMap = {
    'data-access': {},
  };
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

  isPluginAvailable(pluginType: PluginType, pluginId: string): boolean {
    return !!this._pluginAccess[pluginType][pluginId];
  }

  getAccessMap(): PluginAccessMap {
    return { ...this._pluginAccess };
  }

  private async _fetchPluginAccess() {
    const license = env.LICENSE_KEY;

    if (!license || license !== 'premium') {
      return {
        'data-access': {
          postgres: true,
          mysql: false,
          sqlite: true,
        },
      };
    }

    return {
      'data-access': {
        postgres: true,
        mysql: true,
        sqlite: true,
      },
    };
  }
}

export default PluginManager;
