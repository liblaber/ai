import { logger } from '~/utils/logger';
import { DataSourcePluginManager } from '~/lib/plugins/data-source/data-access-plugin-manager';
import type { BaseDatabaseAccessor } from '@liblab/data-access/baseDatabaseAccessor';
import type { DataSourceType } from '@liblab/data-access/utils/types';
import { getDataSourceByConnectionString } from '~/lib/services/dataSourceService';

export async function executeQuery(connectionUrl: string, query: string, params?: string[]): Promise<any[]> {
  const dataSource = await getDataSourceByConnectionString(connectionUrl);

  if (!dataSource) {
    throw new Error('Data source not found for the provided connection URL');
  }

  const dataAccessor = DataSourcePluginManager.getAccessor(dataSource.type as DataSourceType) as BaseDatabaseAccessor;

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
