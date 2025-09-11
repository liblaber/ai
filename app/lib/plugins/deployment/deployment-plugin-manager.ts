import type { DeploymentConfig, DeploymentPlugin, DeploymentProgress, DeploymentResult } from '~/lib/plugins/types';

import { NetlifyDeployPlugin } from './netlify-deploy-plugin';
import { AwsDeployPlugin } from './aws-deploy-plugin';
import { VercelDeployPlugin } from './vercel-deploy-plugin';

export class DeploymentPluginManager {
  private static _instance: DeploymentPluginManager;
  private _plugins: Map<string, DeploymentPlugin> = new Map();
  private _initialized = false;

  private constructor() {}

  static getInstance(): DeploymentPluginManager {
    if (!DeploymentPluginManager._instance) {
      DeploymentPluginManager._instance = new DeploymentPluginManager();
    }

    return DeploymentPluginManager._instance;
  }

  async initialize(): Promise<void> {
    if (this._initialized) {
      return;
    }

    // Register available deployment plugins
    this.registerPlugin(new NetlifyDeployPlugin());
    this.registerPlugin(new AwsDeployPlugin());
    this.registerPlugin(new VercelDeployPlugin());

    this._initialized = true;
  }

  registerPlugin(plugin: DeploymentPlugin): void {
    this._plugins.set(plugin.pluginId, plugin);
  }

  getPlugin(pluginId: string): DeploymentPlugin | undefined {
    return this._plugins.get(pluginId);
  }

  getAvailablePlugins(): DeploymentPlugin[] {
    return Array.from(this._plugins.values());
  }

  async deploy(
    pluginId: string,
    zipFile: File,
    config: DeploymentConfig,
    onProgress: (progress: DeploymentProgress) => Promise<void>,
  ): Promise<DeploymentResult> {
    const plugin = this.getPlugin(pluginId);

    if (!plugin) {
      throw new Error(`Deployment plugin '${pluginId}' not found`);
    }

    return await plugin.deploy(zipFile, config, onProgress);
  }
}

export default DeploymentPluginManager;
