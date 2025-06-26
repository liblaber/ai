import type { ReactNode } from 'react';

export type SettingCategory = 'file_sharing' | 'connectivity' | 'system' | 'services' | 'preferences';

export type TabType = 'data' | 'github' | 'deployed-apps';

export interface SettingItem {
  id: TabType;
  label: string;
  icon: string;
  category: SettingCategory;
  description?: string;
  component: () => ReactNode;
  badge?: string;
  keywords?: string[];
}

export interface TabVisibilityConfig {
  id: TabType;
  visible: boolean;
  order: number;
  isExtraDevTab?: boolean;
  locked?: boolean;
}

export interface TabWindowConfig {
  userTabs: TabVisibilityConfig[];
}

export const TAB_LABELS: Record<TabType, string> = {
  data: 'Data Sources',
  github: 'GitHub',
  'deployed-apps': 'Deployed Apps',
};
