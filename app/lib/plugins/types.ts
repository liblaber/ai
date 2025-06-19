export interface Plugin {
  pluginId: string;
  name: string;
  license: 'free' | 'premium';
  isEnabled: boolean;
}
