import type { TabType, TabVisibilityConfig } from './types';
import { Database, GitBranch, type LucideIcon, Rocket, Users, ShieldUser } from 'lucide-react';

export const TAB_ICONS: Record<TabType, string | LucideIcon> = {
  data: Database,
  github: GitBranch,
  'deployed-apps': Rocket,
  members: Users,
  roles: ShieldUser,
};

export const TAB_LABELS: Record<TabType, string> = {
  data: 'Data Sources',
  github: 'GitHub',
  'deployed-apps': 'Deployed Apps',
  members: 'Members',
  roles: 'Roles',
};

export const TAB_DESCRIPTIONS: Record<TabType, string> = {
  data: 'Manage your data sources',
  github: 'Manage GitHub connection and repository settings',
  'deployed-apps': 'View and manage your deployed applications',
  members: 'Manage your users',
  roles: 'Manage roles and permissions for users',
};

export const DEFAULT_TAB_CONFIG: TabVisibilityConfig[] = [
  { id: 'data', visible: true, window: 'user', order: 0 },
  { id: 'github', visible: true, window: 'user', order: 1 },
  { id: 'deployed-apps', visible: true, window: 'user', order: 2 },

  { id: 'members', visible: true, window: 'admin', order: 1 },
  { id: 'roles', visible: true, window: 'admin', order: 2 },
];
