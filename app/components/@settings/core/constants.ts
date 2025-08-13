import type { TabType, TabVisibilityConfig } from './types';
import { Building, Database, GitBranch, type LucideIcon, Rocket, Users } from 'lucide-react';

export const TAB_ICONS: Record<TabType, string | LucideIcon> = {
  data: Database,
  github: GitBranch,
  'deployed-apps': Rocket,
  organization: Building,
  members: Users,
};

export const TAB_LABELS: Record<TabType, string> = {
  data: 'Data Sources',
  github: 'GitHub',
  'deployed-apps': 'Deployed Apps',
  organization: 'Organization',
  members: 'Members',
};

export const TAB_DESCRIPTIONS: Record<TabType, string> = {
  data: 'Manage your data sources',
  github: 'Manage GitHub connection and repository settings',
  'deployed-apps': 'View and manage your deployed applications',
  organization: 'Manage your organization',
  members: 'Manage your organization members',
};

export const DEFAULT_TAB_CONFIG: TabVisibilityConfig[] = [
  { id: 'data', visible: true, window: 'user', order: 0 },
  { id: 'github', visible: true, window: 'user', order: 1 },
  { id: 'deployed-apps', visible: true, window: 'user', order: 2 },

  { id: 'organization', visible: true, window: 'admin', order: 0 },
  { id: 'members', visible: true, window: 'admin', order: 1 },
];
