import { env } from '~/env';
import {
  type AuthPluginId,
  type DataAccessPluginId,
  type DeploymentPluginId,
  type PluginAccessMap,
  type PluginId,
  PluginType,
  type StarterPluginId,
  type UserManagementPluginId,
} from '~/lib/plugins/types';

export const FREE_PLUGIN_ACCESS: PluginAccessMap = {
  [PluginType.DATA_ACCESS]: {
    postgres: true,
    mysql: true,
    sqlite: true,
    mongodb: true,
    hubspot: true,
    'google-docs': true,
    'google-sheets': true,
  },
  [PluginType.AUTH]: {
    anonymous: true,
    google: false,
    oidc: false,
    twitch: false,
    twitter: false,
  },
  [PluginType.STARTER]: {
    remix: true,
    next: true,
  },
  [PluginType.USER_MANAGEMENT]: {
    'single-user': true,
    'multi-user': false,
  },
  [PluginType.DEPLOYMENT]: {
    NETLIFY: true,
    VERCEL: false,
    AWS: false,
  },
};

export const PREMIUM_PLUGIN_ACCESS = {
  [PluginType.DATA_ACCESS]: {
    postgres: true,
    mysql: true,
    sqlite: true,
    mongodb: true,
    hubspot: true,
    'google-docs': true,
    'google-sheets': true,
  },
  [PluginType.AUTH]: {
    anonymous: false,
    google: true,
    oidc: true,
    twitch: false,
    twitter: false,
  },
  [PluginType.STARTER]: {
    remix: true,
    next: true,
  },
  [PluginType.USER_MANAGEMENT]: {
    'single-user': true,
    'multi-user': true,
  },
  [PluginType.DEPLOYMENT]: {
    NETLIFY: true,
    VERCEL: true,
    AWS: true,
  },
};

class PluginManager {
  private static _instance: PluginManager;
  private _pluginAccess: PluginAccessMap = FREE_PLUGIN_ACCESS;
  private _initialized = false;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  static getInstance(): PluginManager {
    if (!PluginManager._instance) {
      PluginManager._instance = new PluginManager();
    }

    return PluginManager._instance;
  }

  async initialize(): Promise<void> {
    if (this._initialized) {
      return;
    }

    this._pluginAccess = await this._fetchPluginAccess();

    this._initialized = true;
  }

  isPluginAvailable(pluginType: PluginType, pluginId: PluginId): boolean {
    if (pluginType === PluginType.DATA_ACCESS) {
      return this._pluginAccess[pluginType][pluginId as DataAccessPluginId];
    } else if (pluginType === PluginType.AUTH) {
      return this._pluginAccess[pluginType][pluginId as AuthPluginId];
    } else if (pluginType === PluginType.STARTER) {
      return this._pluginAccess[pluginType][pluginId as StarterPluginId];
    } else if (pluginType === PluginType.USER_MANAGEMENT) {
      return this._pluginAccess[pluginType][pluginId as UserManagementPluginId];
    } else if (pluginType === PluginType.DEPLOYMENT) {
      return this._pluginAccess[pluginType][pluginId as DeploymentPluginId];
    }

    return false;
  }

  getAccessMap(): PluginAccessMap {
    return { ...this._pluginAccess };
  }

  // Mock API call until we implement the backend
  private async _fetchPluginAccess(): Promise<PluginAccessMap> {
    const license = env.server.LICENSE_KEY;

    if (!license || license !== 'premium') {
      return FREE_PLUGIN_ACCESS;
    }

    const {
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      OIDC_ISSUER,
      OIDC_CLIENT_ID,
      OIDC_CLIENT_SECRET,
      OIDC_DOMAIN,
      OIDC_PROVIDER_ID,
    } = env.server;

    // Check if Google OAuth is configured
    const hasGoogleOAuth = !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);

    // Check if OIDC SSO is configured
    const hasOIDCSSO = !!(OIDC_ISSUER && OIDC_CLIENT_ID && OIDC_CLIENT_SECRET && OIDC_DOMAIN && OIDC_PROVIDER_ID);

    return {
      ...PREMIUM_PLUGIN_ACCESS,
      [PluginType.AUTH]: {
        ...PREMIUM_PLUGIN_ACCESS[PluginType.AUTH],
        anonymous: !(hasGoogleOAuth || hasOIDCSSO),
        google: hasGoogleOAuth,
        oidc: hasOIDCSSO,
      },
    };
  }
}

export default PluginManager;
