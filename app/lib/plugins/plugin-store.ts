import { create } from 'zustand';

export type PluginType = 'data-access'; // Extend as needed
export type PluginAccessMap = { [type in PluginType]: Record<string, boolean> };

export interface DataSourceType {
  value: string;
  label: string;
  connectionStringFormat: string;
  available: boolean;
}

interface PluginStoreState {
  pluginAccess: PluginAccessMap;
  dataSourceTypes: DataSourceType[];
  setPluginAccess: (map: PluginAccessMap) => void;
  setDataSourceTypes: (types: DataSourceType[]) => void;
  isPluginEnabled: (pluginType: PluginType, pluginId: string) => boolean;
}

export const usePluginStore = create<PluginStoreState>()((set, get) => ({
  pluginAccess: { 'data-access': {} },
  dataSourceTypes: [],
  setPluginAccess: (map) => set({ pluginAccess: map }),
  setDataSourceTypes: (types) => set({ dataSourceTypes: types }),
  isPluginEnabled: (pluginType, pluginId) => !!get().pluginAccess[pluginType][pluginId],
}));
