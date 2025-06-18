import { json } from '@remix-run/cloudflare';
import { getEnabledPlugins } from '~/lib/deployment/plugins';
import { PluginManager } from '~/lib/deployment/plugin-manager';

export async function loader() {
  const pluginManager = PluginManager.getInstance();
  const dbPlugins = await pluginManager.getAllPlugins();
  const dbPluginIds = new Set(dbPlugins.map((p) => p.id));

  // Get metadata from all plugins
  const plugins = await Promise.all(
    (await getEnabledPlugins()).map(async (plugin) => {
      const isEnabled = await plugin.isEnabled();
      return {
        id: plugin.id,
        name: plugin.name,
        description: plugin.description,
        icon: plugin.icon,
        theme: plugin.theme,
        isEnabled,
        isDeletable: dbPluginIds.has(plugin.id), // Only database plugins are deletable
      };
    }),
  );

  // Filter out disabled plugins
  const enabledPlugins = plugins.filter((plugin) => plugin.isEnabled);

  return json({ plugins: enabledPlugins });
}

export async function action({ request }: { request: Request }) {
  if (request.method !== 'DELETE') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const formData = await request.formData();
    const pluginId = formData.get('pluginId') as string;

    if (!pluginId) {
      return json({ error: 'Plugin ID is required' }, { status: 400 });
    }

    const pluginManager = PluginManager.getInstance();
    await pluginManager.deletePlugin(pluginId);

    return json({ success: true });
  } catch (error) {
    console.error('Error deleting plugin:', error);
    return json({ error: error instanceof Error ? error.message : 'Failed to delete plugin' }, { status: 500 });
  }
}
