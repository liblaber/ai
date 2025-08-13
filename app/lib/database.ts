import { logger } from '~/utils/logger';
import { DataSourcePluginManager } from '~/lib/plugins/data-access/data-access-plugin-manager';

export async function executeQuery(connectionUrl: string, query: string, params?: string[]): Promise<any[]> {
  const dataAccessor = DataSourcePluginManager.getAccessor(connectionUrl);

  try {
    await dataAccessor.initialize(connectionUrl);
    dataAccessor.guardAgainstMaliciousQuery(query);

    return await dataAccessor.executeQuery(query, params);
  } catch (e) {
    // Enhanced error logging for MongoDB JSON parsing issues
    const isMongoError = connectionUrl.startsWith('mongodb');
    const isJsonError = e instanceof Error && e.message.includes('Invalid JSON format');

    if (isMongoError && isJsonError) {
      logger.error('MongoDB JSON parsing error:', {
        error: e instanceof Error ? e.message : String(e),
        query,
        queryLength: query.length,
        queryType: typeof query,
        firstChars: query.substring(0, 100),
        lastChars: query.substring(Math.max(0, query.length - 100)),
      });
    } else {
      logger.error('Error executing query:', JSON.stringify(e), query);
    }

    throw e;
  } finally {
    if (dataAccessor) {
      await dataAccessor.close();
    }
  }
}
