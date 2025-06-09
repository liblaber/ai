import { create } from 'zustand';

export interface TabConfig {
  id: string;
  visible: boolean;
  window: 'developer' | 'user';
  order: number;
  locked?: boolean;
}

interface TabConfigurationStore {
  userTabs: TabConfig[];
  developerTabs: TabConfig[];
  get: () => { userTabs: TabConfig[]; developerTabs: TabConfig[] };
  set: (config: { userTabs: TabConfig[]; developerTabs: TabConfig[] }) => void;
  reset: () => void;
}

const DEFAULT_CONFIG = {
  userTabs: [],
  developerTabs: [],
};

export const tabConfigurationStore = create<TabConfigurationStore>((set, get) => ({
  ...DEFAULT_CONFIG,
  get: () => ({
    userTabs: get().userTabs,
    developerTabs: get().developerTabs,
  }),
  set: (config) => set(config),
  reset: () => set(DEFAULT_CONFIG),
}));
