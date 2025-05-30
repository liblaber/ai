import type { TabType, TabVisibilityConfig } from './types';
import { CopySuccess, type IconProps } from 'iconsax-reactjs';
import type { ComponentType } from 'react';

export const TAB_ICONS: Record<TabType, string | ComponentType<IconProps>> = {
  data: 'i-ph:database-fill',
  github: 'i-ph:github-logo',
  'deployed-apps': CopySuccess,
};

export const TAB_LABELS: Record<TabType, string> = {
  data: 'Data Management',
  github: 'GitHub',
  'deployed-apps': 'Deployed Apps',
};

export const TAB_DESCRIPTIONS: Record<TabType, string> = {
  data: 'Manage your data and storage',
  github: 'Manage GitHub connection and repository settings',
  'deployed-apps': 'View and manage your deployed applications',
};

export const DEFAULT_TAB_CONFIG: TabVisibilityConfig[] = [
  { id: 'data', visible: true, order: 0 },
  { id: 'github', visible: true, order: 1 },
  { id: 'deployed-apps', visible: true, order: 2 },
];
