export type PluginAccessMap = { [pluginId: string]: boolean };

export interface PluginMeta {
  id: string;
  name: string;
  version: string;
  license: 'free' | 'premium';
}
