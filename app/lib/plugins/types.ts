export enum PluginType {
  AUTH = 'auth',
  DATA_ACCESS = 'data-access',
  MCP = 'mcp',
  STARTER = 'starter',
}

export type DataAccessPluginId = 'postgres' | 'mysql' | 'sqlite';
export type AuthPluginId = 'anonymous' | 'google' | 'twitch' | 'twitter';
export type StarterPluginId = 'remix' | 'next';
export type McpPluginId = 'mcp';

export type PluginAccessMap = {
  [PluginType.DATA_ACCESS]: Record<DataAccessPluginId, boolean>;
  [PluginType.AUTH]: Record<AuthPluginId, boolean>;
  [PluginType.STARTER]: Record<StarterPluginId, boolean>;
  [PluginType.MCP]: Record<McpPluginId, boolean>;
};

export type PluginId = DataAccessPluginId | AuthPluginId | StarterPluginId | McpPluginId;

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
