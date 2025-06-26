export enum PluginType {
  DATA_ACCESS = 'data-access',
  AUTH = 'auth',
}

export type DataAccessPluginId = 'postgres' | 'mysql' | 'sqlite';
export type AuthPluginId = 'anonymous' | 'google' | 'twitch' | 'twitter';

export type PluginAccessMap = {
  [PluginType.DATA_ACCESS]: Record<DataAccessPluginId, boolean>;
  [PluginType.AUTH]: Record<AuthPluginId, boolean>;
};

export type PluginId = DataAccessPluginId | AuthPluginId;

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
