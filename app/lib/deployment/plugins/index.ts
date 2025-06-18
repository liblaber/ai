import { type DeploymentPlugin } from '~/types/deployment';
import { netlifyPlugin } from './netlify';
import { localPlugin } from './local';
import { PluginManager } from '~/lib/deployment/plugin-manager';

// Built-in plugins
const builtInPlugins: DeploymentPlugin[] = [netlifyPlugin, localPlugin];

export async function getEnabledPlugins(): Promise<DeploymentPlugin[]> {
  const enabledPlugins: DeploymentPlugin[] = [];
  const pluginManager = PluginManager.getInstance();

  // Get built-in plugins
  for (const plugin of builtInPlugins) {
    if (await plugin.isEnabled()) {
      enabledPlugins.push(plugin);
    }
  }

  // Get database-stored plugins
  const dbPlugins = await pluginManager.getAllPlugins();
  enabledPlugins.push(...dbPlugins);

  return enabledPlugins;
}

export async function getPluginById(id: string): Promise<DeploymentPlugin | undefined> {
  // First check built-in plugins
  const builtInPlugin = builtInPlugins.find((plugin) => plugin.id === id);

  if (builtInPlugin) {
    return builtInPlugin;
  }

  // Then check database plugins
  const pluginManager = PluginManager.getInstance();
  const dbPlugin = await pluginManager.getPluginById(id);

  return dbPlugin || undefined;
}
