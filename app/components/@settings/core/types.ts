export type TabType =
  | 'data'
  | 'github'
  | 'deployed-apps'
  | 'members'
  | 'roles'
  | 'environments'
  | 'secrets-manager'
  | 'deployment-methods';

export type WindowType = 'user' | 'admin';

export interface TabVisibilityConfig {
  id: TabType;
  visible: boolean;
  window: WindowType;
  order: number;
  isExtraDevTab?: boolean;
  locked?: boolean;
}

export interface AdminTabConfig extends TabVisibilityConfig {
  window: 'admin';
}

export interface UserTabConfig extends TabVisibilityConfig {
  window: 'user';
}

export interface TabWindowConfig {
  userTabs: UserTabConfig[];
  adminTabs: AdminTabConfig[];
}

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
