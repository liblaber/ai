import type { TabType, TabVisibilityConfig } from './types';
import { Database, GitBranch, type LucideIcon, Rocket, Users, Server, ShieldUser, Lock } from 'lucide-react';

export const TAB_ICONS: Record<TabType, string | LucideIcon> = {
  data: Database,
  github: GitBranch,
  'deployed-apps': Rocket,
  members: Users,
  roles: ShieldUser,
  environments: Server,
  'secrets-manager': Lock,
  'deployment-methods': Rocket,
};

export const TAB_LABELS: Record<TabType, string> = {
  data: 'Data Sources',
  github: 'GitHub',
  'deployed-apps': 'Deployed Apps',
  members: 'Members',
  roles: 'Roles',
  environments: 'Environments',
  'secrets-manager': 'Secrets Manager',
  'deployment-methods': 'Deployment Methods',
};

export const TAB_DESCRIPTIONS: Record<TabType, string> = {
  data: 'Manage your data sources',
  github: 'Manage GitHub connection and repository settings',
  'deployed-apps': 'View and manage your deployed applications',
  members: 'Manage your members',
  roles: 'Manage roles and permissions for users',
  environments: 'Manage your environments',
  'secrets-manager': 'Manage environment variables and secrets',
  'deployment-methods': 'Manage your deployment method connections',
};

export const DEFAULT_TAB_CONFIG: TabVisibilityConfig[] = [
  { id: 'data', visible: true, window: 'user', order: 0 },
  { id: 'environments', visible: true, window: 'user', order: 1 },
  { id: 'secrets-manager', visible: true, window: 'user', order: 2 },
  { id: 'deployment-methods', visible: true, window: 'user', order: 3 },
  { id: 'github', visible: true, window: 'user', order: 4 },
  { id: 'deployed-apps', visible: true, window: 'user', order: 5 },

  { id: 'members', visible: true, window: 'admin', order: 1 },
  { id: 'roles', visible: true, window: 'admin', order: 2 },
];
