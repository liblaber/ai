import type { TabType, TabVisibilityConfig } from './types';
import { Building, Database, GitBranch, type LucideIcon, Rocket, Users, Server, ShieldUser, Lock } from 'lucide-react';

export const TAB_ICONS: Record<TabType, string | LucideIcon> = {
  data: Database,
  github: GitBranch,
  'deployed-apps': Rocket,
  organization: Building,
  members: Users,
  roles: ShieldUser,
  environments: Server,
  'secrets-manager': Lock,
};

export const TAB_LABELS: Record<TabType, string> = {
  data: 'Data Sources',
  github: 'GitHub',
  'deployed-apps': 'Deployed Apps',
  organization: 'Organization',
  members: 'Members',
  roles: 'Roles',
  environments: 'Environments',
  'secrets-manager': 'Secrets Manager',
};

export const TAB_DESCRIPTIONS: Record<TabType, string> = {
  data: 'Manage your data sources',
  github: 'Manage GitHub connection and repository settings',
  'deployed-apps': 'View and manage your deployed applications',
  organization: 'Manage your organization',
  members: 'Manage your organization members',
  roles: 'Manage roles and permissions for organization members',
  environments: 'Manage your environments',
  'secrets-manager': 'Manage environment variables and secrets',
};

export const DEFAULT_TAB_CONFIG: TabVisibilityConfig[] = [
  { id: 'data', visible: true, window: 'user', order: 0 },
  { id: 'environments', visible: true, window: 'user', order: 1 },
  { id: 'secrets-manager', visible: true, window: 'user', order: 2 },
  { id: 'github', visible: true, window: 'user', order: 3 },
  { id: 'deployed-apps', visible: true, window: 'user', order: 4 },

  { id: 'organization', visible: true, window: 'admin', order: 0 },
  { id: 'members', visible: true, window: 'admin', order: 1 },
  { id: 'roles', visible: true, window: 'admin', order: 2 },
];
