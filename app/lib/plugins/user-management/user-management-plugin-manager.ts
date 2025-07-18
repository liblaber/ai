import fs from 'fs';
import { SingleUserManagement } from './single-user-management';
import { MultiUserManagement } from './multi-user-management';
import PluginManager from '~/lib/plugins/plugin-manager';
import { PluginType, type UserManagementPluginId } from '~/lib/plugins/types';
import path from 'path';

const DEFAULT_PLUGIN_PATH = path.join(process.cwd(), 'app/lib/plugins/user-management/custom-user-management.ts');

// const DEFAULT_PLUGIN_PATH = 'fo';
export interface UserManagementPlugin {
  createOrganizationFromEmail(email: string, userId: string): Promise<void>;
}

export class UserManagementPluginManager {
  private static _plugin: UserManagementPlugin | null = null;

  static async getPlugin(): Promise<UserManagementPlugin> {
    if (!this._plugin) {
      this._plugin = await this._loadUserManagementPlugin();
    }

    return this._plugin;
  }

  private static async _loadUserManagementPlugin(): Promise<UserManagementPlugin> {
    const customPlugin = await this._tryLoadCustomPlugin();

    if (customPlugin) {
      return customPlugin;
    }

    if (this._isAvailable(MultiUserManagement.pluginId as UserManagementPluginId)) {
      return new MultiUserManagement();
    }

    return new SingleUserManagement();
  }

  private static async _tryLoadCustomPlugin(): Promise<UserManagementPlugin | null> {
    if (!fs.existsSync(DEFAULT_PLUGIN_PATH)) {
      return null;
    }

    try {
      const pluginModule = await import(/* @vite-ignore */ DEFAULT_PLUGIN_PATH);
      return new pluginModule.default();
    } catch {
      return null;
    }
  }

  private static _isAvailable(pluginId: UserManagementPluginId): boolean {
    return PluginManager.getInstance().isPluginAvailable(PluginType.USER_MANAGEMENT, pluginId);
  }
}
