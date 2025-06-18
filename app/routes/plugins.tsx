import type { LoaderFunction } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData } from '@remix-run/react';
import { PluginManager } from '~/lib/deployment/plugin-manager';
import { PluginManager as PluginManagerComponent } from '~/components/plugins/PluginManager.client';

interface PluginMetadata {
  id: string;
  name: string;
  description: string;
  icon: string;
  theme: {
    primary: string;
    background: string;
    hover: string;
  };
}

interface LoaderData {
  plugins: PluginMetadata[];
}

export const loader: LoaderFunction = async () => {
  const pluginManager = PluginManager.getInstance();
  const plugins = (await pluginManager.getAllPlugins()).map((plugin) => ({
    id: plugin.id,
    name: plugin.name,
    description: plugin.description,
    icon: plugin.icon,
    theme: plugin.theme,
  }));

  return json<LoaderData>({ plugins });
};

export default function PluginsPage() {
  const { plugins } = useLoaderData<LoaderData>();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Plugin Management</h1>
      <PluginManagerComponent plugins={plugins} />
    </div>
  );
}
