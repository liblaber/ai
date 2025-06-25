import { create } from 'zustand';
import { AUTH, DATA_ACCESS, type PluginAccessMap, type PluginType } from '~/lib/plugins/plugin-manager';

interface PluginStoreState {
  pluginAccess: PluginAccessMap;
  setPluginAccess: (map: PluginAccessMap) => void;
  isPluginEnabled: (pluginType: PluginType, pluginId: string) => boolean;
}

export const usePluginStore = create<PluginStoreState>()((set, get) => ({
  pluginAccess: { [DATA_ACCESS]: {}, [AUTH]: {} },
  setPluginAccess: (map) => set({ pluginAccess: map }),
  isPluginEnabled: (pluginType, pluginId) => !!get().pluginAccess[pluginType][pluginId],
}));
