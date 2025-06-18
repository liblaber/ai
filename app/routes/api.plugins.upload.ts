import type { ActionFunction } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { PluginManager } from '~/lib/deployment/plugin-manager';

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const formData = await request.formData();
    const pluginFile = formData.get('plugin') as File;

    if (!pluginFile) {
      return json({ error: 'No plugin file provided' }, { status: 400 });
    }

    if (!pluginFile.name.endsWith('.zip')) {
      return json({ error: 'Only .zip files are supported' }, { status: 400 });
    }

    // Convert File to Buffer
    const arrayBuffer = await pluginFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Install the plugin
    const pluginManager = PluginManager.getInstance();
    const plugin = await pluginManager.installPlugin(buffer);

    if (!plugin) {
      return json({ error: 'Failed to install plugin' }, { status: 500 });
    }

    return json(
      {
        success: true,
        plugin: {
          id: plugin.id,
          name: plugin.name,
          description: plugin.description,
          icon: plugin.icon,
          theme: plugin.theme,
          isDeletable: true,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error installing plugin:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to install plugin';

    return json({ error: errorMessage }, { status: 500 });
  }
};
