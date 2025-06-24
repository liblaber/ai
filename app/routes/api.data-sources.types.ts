import { json } from '@remix-run/cloudflare';
import { DataSourcePluginManager } from '~/lib/plugins/data-access/data-access-plugin-manager';

export async function loader() {
  const databaseTypes = DataSourcePluginManager.getAvailableDatabaseTypes();
  return json(databaseTypes);
}
