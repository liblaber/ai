import { type DeploymentPlugin } from '~/types/deployment';
import { netlifyPlugin } from './netlify';
import { localPlugin } from './local';

export const deploymentPlugins: DeploymentPlugin[] = [netlifyPlugin, localPlugin];

export async function getEnabledPlugins(): Promise<DeploymentPlugin[]> {
  const enabledPlugins: DeploymentPlugin[] = [];

  for (const plugin of deploymentPlugins) {
    if (await plugin.isEnabled()) {
      enabledPlugins.push(plugin);
    }
  }

  return enabledPlugins;
}

export function getPluginById(id: string): DeploymentPlugin | undefined {
  return deploymentPlugins.find((plugin) => plugin.id === id);
}
