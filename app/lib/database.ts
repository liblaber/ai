import { logger } from '~/utils/logger';
import { DataSourcePluginManager } from '~/lib/plugins/data-access/data-access-plugin-manager';

export async function executeQuery(connectionUrl: string, query: string, params?: string[]): Promise<any[]> {
  const dataAccessor = DataSourcePluginManager.getAccessor(connectionUrl);

  try {
    await dataAccessor.initialize(connectionUrl);
    dataAccessor.guardAgainstMaliciousQuery(query);

    return await dataAccessor.executeQuery(query, params);
  } catch (e) {
    logger.error('Error executing query:', JSON.stringify(e), query);
    throw e;
  } finally {
    if (dataAccessor) {
      await dataAccessor.close();
    }
  }
}
