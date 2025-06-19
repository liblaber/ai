// DataSourcePluginManager: manages data source plugin access
import PluginManager, { type PluginAccessMap, type PluginType } from '~/lib/plugins/plugin-manager';
import type { DataSourceType } from '~/lib/stores/dataSourceTypes';

export class DataSourcePluginManager {
  static pluginType: PluginType = 'data-access';

  dataSourceTypes: DataSourceType[] = [];

  static isAvailable(type: string): boolean {
    // Normalize type (e.g., 'postgresql' -> 'postgres')
    const normalized = type.replace('postgresql', 'postgres');
    return PluginManager.getInstance().isPluginAvailable(DataSourcePluginManager.pluginType, normalized);
  }

  static getAvailableTypes(): string[] {
    const accessMap = PluginManager.getInstance().getAccessMap();
    return Object.keys(accessMap).filter((key) => accessMap[DataSourcePluginManager.pluginType][key]);
  }

  static getAccessMap(): PluginAccessMap {
    return PluginManager.getInstance().getAccessMap();
  }

  async initialize(dataSourceTypes: DataSourceType[]): Promise<void> {
    await PluginManager.getInstance().initialize();
    this.dataSourceTypes = dataSourceTypes;
  }
}
