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
  data: 'Data Management',
  github: 'GitHub',
  'deployed-apps': 'Deployed Apps',
};

export const categoryLabels: Record<SettingCategory, string> = {
  file_sharing: 'File Sharing',
  connectivity: 'Connectivity',
  system: 'System',
  services: 'Services',
  preferences: 'Preferences',
};

export const categoryIcons: Record<SettingCategory, string> = {
  file_sharing: 'i-ph:folder-simple',
  connectivity: 'i-ph:wifi-high',
  system: 'i-ph:gear',
  services: 'i-ph:cube',
  preferences: 'i-ph:sliders',
};
