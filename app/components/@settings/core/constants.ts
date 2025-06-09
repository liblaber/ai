import type { TabType } from './types';
import { CopySuccess, type IconProps } from 'iconsax-reactjs';
import type { ComponentType } from 'react';

export const TAB_ICONS: Record<TabType, string | ComponentType<IconProps>> = {
  settings: 'i-ph:gear-six-fill',
  data: 'i-ph:database-fill',
  'service-status': 'i-ph:activity-bold',
  github: 'i-ph:github-logo',
  'task-manager': 'i-ph:chart-line-fill',
  'tab-management': 'i-ph:squares-four-fill',
  'deployed-apps': CopySuccess,
  credits: 'i-ph:credit-card-fill',
};

export const TAB_LABELS: Record<TabType, string> = {
  settings: 'Settings',
  data: 'Data Sources',
  'service-status': 'Service Status',
  github: 'GitHub',
  'task-manager': 'Task Manager',
  'tab-management': 'Tab Management',
  'deployed-apps': 'Deployed Apps',
  credits: 'Credits',
};

export const TAB_DESCRIPTIONS: Record<TabType, string> = {
  settings: 'Configure application preferences',
  data: 'Manage your data and storage',
  'service-status': 'Monitor cloud LLM service status',
  github: 'Manage GitHub connection and repository settings',
  'task-manager': 'Monitor system resources and processes',
  'tab-management': 'Configure visible tabs and their order',
  'deployed-apps': 'View and manage your deployed applications',
  credits: 'Manage your credits and usage',
};

export const DEFAULT_TAB_CONFIG = [
  // User Window Tabs (Always visible by default)
  { id: 'data', visible: true, window: 'user' as const, order: 0 },
  { id: 'github', visible: true, window: 'user' as const, order: 1 },

  // User Window Tabs (In dropdown, initially hidden)
  { id: 'settings', visible: false, window: 'user' as const, order: 2 },
  { id: 'task-manager', visible: false, window: 'user' as const, order: 3 },
  { id: 'service-status', visible: false, window: 'user' as const, order: 4 },
  {
    id: 'deployed-apps',
    visible: true,
    window: 'user',
    order: 5,
  },
  {
    id: 'credits',
    visible: true,
    window: 'user',
    order: 6,
  },

  // Developer Window Tabs (All visible by default)
  { id: 'data', visible: true, window: 'developer' as const, order: 0 },
  { id: 'github', visible: true, window: 'developer' as const, order: 1 },
  { id: 'settings', visible: true, window: 'developer' as const, order: 2 },
  { id: 'task-manager', visible: true, window: 'developer' as const, order: 3 },
  { id: 'service-status', visible: true, window: 'developer' as const, order: 4 },
  {
    id: 'deployed-apps',
    visible: true,
    window: 'developer',
    order: 5,
  },
];
