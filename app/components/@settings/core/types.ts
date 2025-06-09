import type { ReactNode } from 'react';

export type SettingCategory = 'file_sharing' | 'connectivity' | 'system' | 'services' | 'preferences';

export type TabType =
  | 'settings'
  | 'data'
  | 'service-status'
  | 'github'
  | 'task-manager'
  | 'deployed-apps'
  | 'tab-management'
  | 'credits';

export type WindowType = 'user' | 'developer';

export interface UserProfile {
  nickname: any;
  name: string;
  email: string;
  avatar?: string;
  theme: 'light' | 'dark' | 'system';
  password?: string;
  bio?: string;
  language: string;
  timezone: string;
}

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
  window: WindowType;
  order: number;
  isExtraDevTab?: boolean;
  locked?: boolean;
}

export interface DevTabConfig extends TabVisibilityConfig {
  window: 'developer';
}

export interface UserTabConfig extends TabVisibilityConfig {
  window: 'user';
}

export interface TabWindowConfig {
  userTabs: UserTabConfig[];
  developerTabs: DevTabConfig[];
}

export const TAB_LABELS: Record<TabType, string> = {
  settings: 'Settings',
  data: 'Data Management',
  'service-status': 'Service Status',
  github: 'GitHub',
  'task-manager': 'Task Manager',
  'tab-management': 'Tab Management',
  'deployed-apps': 'Deployed Apps',
  credits: 'Credits',
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
