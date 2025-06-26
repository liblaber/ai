import { create } from 'zustand';
import { FREE_PLUGIN_ACCESS } from '~/lib/plugins/plugin-manager';
import type { AuthPluginId, DataAccessPluginId, PluginAccessMap, PluginId, PluginType } from '~/lib/plugins/types';
import { PluginType as PluginTypeValue } from '~/lib/plugins/types';

interface PluginStoreState {
  pluginAccess: PluginAccessMap;
  setPluginAccess: (map: PluginAccessMap) => void;
  isPluginEnabled: (pluginType: PluginType, pluginId: PluginId) => boolean;
}

export const usePluginStore = create<PluginStoreState>()((set, get) => ({
  pluginAccess: FREE_PLUGIN_ACCESS,
  setPluginAccess: (map) => set({ pluginAccess: map }),
  isPluginEnabled: (pluginType, pluginId) => {
    if (pluginType === PluginTypeValue.DATA_ACCESS) {
      return get().pluginAccess[pluginType][pluginId as DataAccessPluginId];
    } else if (pluginType === PluginTypeValue.AUTH) {
      return get().pluginAccess[pluginType][pluginId as AuthPluginId];
    }

    return false;
  },
}));
