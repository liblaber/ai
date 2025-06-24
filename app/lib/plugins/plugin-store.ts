import { create } from 'zustand';
import { DATA_ACCESS } from '~/lib/plugins/plugin-manager';

export type PluginType = typeof DATA_ACCESS;
export type PluginAccessMap = { [type in PluginType]: Record<string, boolean> };

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
