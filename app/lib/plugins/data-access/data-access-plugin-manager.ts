// DataSourcePluginManager: manages data source plugin access
import PluginManager, { type PluginType } from '~/lib/plugins/plugin-manager';
import { DATA_ACCESS } from '~/lib/plugins/plugin-store';

export class DataSourcePluginManager {
  static pluginType: PluginType = DATA_ACCESS;

  static isAvailable(type: string): boolean {
    // Normalize type (e.g., 'postgresql' -> 'postgres')
    const normalized = type.replace('postgresql', 'postgres');
    return PluginManager.getInstance().isPluginAvailable(DataSourcePluginManager.pluginType, normalized);
  }

  async initialize(): Promise<void> {
    await PluginManager.getInstance().initialize();
  }
}
