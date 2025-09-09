import { type Website } from '~/lib/stores/websiteStore';

export enum PluginType {
  DATA_ACCESS = 'data-access',
  AUTH = 'auth',
  STARTER = 'starter',
  USER_MANAGEMENT = 'user-management',
  DEPLOYMENT = 'deployment',
}

export type DataAccessPluginId =
  | 'postgres'
  | 'mysql'
  | 'sqlite'
  | 'mongodb'
  | 'hubspot'
  | 'google-docs'
  | 'google-sheets';
export type AuthPluginId = 'anonymous' | 'google' | 'twitch' | 'twitter';
export type StarterPluginId = 'remix' | 'next';
export type UserManagementPluginId = 'single-user' | 'multi-user';
export type DeploymentPluginId = 'NETLIFY' | 'VERCEL' | 'RAILWAY' | 'AWS';

export type PluginAccessMap = {
  [PluginType.DATA_ACCESS]: Record<DataAccessPluginId, boolean>;
  [PluginType.AUTH]: Record<AuthPluginId, boolean>;
  [PluginType.STARTER]: Record<StarterPluginId, boolean>;
  [PluginType.USER_MANAGEMENT]: Record<UserManagementPluginId, boolean>;
  [PluginType.DEPLOYMENT]: Record<DeploymentPluginId, boolean>;
};

export type PluginId =
  | DataAccessPluginId
  | AuthPluginId
  | StarterPluginId
  | UserManagementPluginId
  | DeploymentPluginId;

export interface Plugin {
  pluginId: PluginId;
}

// SSO providers from better-auth: https://www.better-auth.com/docs/authentication/apple
export type AuthProviderType =
  | 'google'
  | 'twitch'
  | 'twitter'
  | 'github'
  | 'apple'
  | 'discord'
  | 'facebook'
  | 'microsoft'
  | 'spotify'
  | 'dropbox'
  | 'kick'
  | 'linkedin'
  | 'gitlab'
  | 'tiktok'
  | string;

export interface AuthProvider extends Plugin {
  pluginId: AuthPluginId;
  icon: React.ReactNode;
  label: string;
  provider: AuthProviderType;
}

// Deployment plugin types
export interface DeploymentConfig {
  siteId?: string;
  websiteId?: string;
  chatId: string;
  description?: string;
  userId: string;
  environmentId?: string;
}

export interface DeploymentProgress {
  step: number;
  totalSteps: number;
  message: string;
  status: 'in_progress' | 'success' | 'error';
  data?: any;
  error?: {
    code: string;
    message: string;
  };
}

export interface DeploymentResult {
  deploy: {
    id: string;
    state: string;
    url: string;
  };
  site: {
    id: string;
    name: string;
    url: string;
    chatId: string;
  };
  website: Website;
}

export interface DeploymentPlugin extends Plugin {
  pluginId: DeploymentPluginId;
  name: string;
  description: string;

  deploy(
    zipFile: File,
    config: DeploymentConfig,
    onProgress: (progress: DeploymentProgress) => Promise<void>,
  ): Promise<DeploymentResult>;
}
