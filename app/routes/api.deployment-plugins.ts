import { json } from '@remix-run/cloudflare';
import { deploymentPlugins } from '~/lib/deployment/plugins';

export async function loader() {
  // Get metadata from all plugins
  const plugins = await Promise.all(
    deploymentPlugins.map(async (plugin) => {
      const isEnabled = await plugin.isEnabled();
      return {
        id: plugin.id,
        name: plugin.name,
        description: plugin.description,
        icon: plugin.icon,
        theme: plugin.theme,
        isEnabled,
      };
    }),
  );

  // Filter out disabled plugins
  const enabledPlugins = plugins.filter((plugin) => plugin.isEnabled);

  return json(enabledPlugins);
}
