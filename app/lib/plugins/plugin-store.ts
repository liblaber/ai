import { create } from 'zustand';

export type PluginType = 'data-access'; // Extend as needed
export type PluginAccessMap = { [type in PluginType]: Record<string, boolean> };

export const DATA_ACCESS = 'data-access';

export interface DataSourceType {
  value: string;
  label: string;
  connectionStringFormat: string;
  available: boolean;
}

interface PluginStoreState {
  pluginAccess: PluginAccessMap;
  setPluginAccess: (map: PluginAccessMap) => void;
  isPluginEnabled: (pluginType: PluginType, pluginId: string) => boolean;
}

export const usePluginStore = create<PluginStoreState>()((set, get) => ({
  pluginAccess: { [DATA_ACCESS]: {} },
  setPluginAccess: (map) => set({ pluginAccess: map }),
  isPluginEnabled: (pluginType, pluginId) => !!get().pluginAccess[pluginType][pluginId],
}));
