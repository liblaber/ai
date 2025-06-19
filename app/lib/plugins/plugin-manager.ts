import { env } from '~/lib/config/env';

// Centralized PluginManager
export type PluginType = 'data-access';

export type PluginAccessMap = Record<PluginType, Record<string, boolean>>;

class PluginManager {
  private static _instance: PluginManager;
  private _pluginAccess: PluginAccessMap = {
    // TODO: initialize all to false?
    'data-access': {},
  };
  private _initialized = false;

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

// DataSourcePluginManager: manages data source plugin access
export class DataSourcePluginManager {
  static pluginType: PluginType = 'data-access';

  static async initialize() {
    await PluginManager.getInstance().initialize();
  }

  static isAvailable(type: string): boolean {
    // Normalize type (e.g., 'postgresql' -> 'postgres')
    const normalized = type.replace('postgresql', 'postgres');
    return PluginManager.getInstance().isPluginAvailable(DataSourcePluginManager.pluginType, normalized);
  }

  static getAvailableTypes(): string[] {
    const accessMap = PluginManager.getInstance().getAccessMap();
    return Object.keys(accessMap).filter((k) => accessMap[DataSourcePluginManager.pluginType][k]);
  }

  static getAccessMap(): PluginAccessMap {
    return PluginManager.getInstance().getAccessMap();
  }
}

export default PluginManager;

export async function initializeAllPluginManagers() {
  await DataSourcePluginManager.initialize();
}
