import { logger } from '~/utils/logger';
import { isGoogleConnection } from '@liblab/data-access/accessors/google-sheets';
import { DataSourcePluginManager } from '~/lib/plugins/data-source/data-access-plugin-manager';
import type { BaseDatabaseAccessor } from '@liblab/data-access/baseDatabaseAccessor';
import { DataSourceType } from '@liblab/data-access/utils/types';

export async function executeQuery(
  connectionUrl: string,
  dataSourceType: DataSourceType,
  query: string,
  params?: string[],
): Promise<any[]> {
  const dataAccessor = (await DataSourcePluginManager.getAccessor(dataSourceType)) as BaseDatabaseAccessor;

  try {
    await dataAccessor.initialize(connectionUrl);

    dataAccessor.guardAgainstMaliciousQuery(query);

    return await dataAccessor.executeQuery(query, params);
  } catch (e) {
    // Enhanced error logging for MongoDB and Google Sheets JSON parsing issues
    const isMongoError = connectionUrl.startsWith('mongodb');
    const isSheetsError = isGoogleConnection(connectionUrl);
    const isJsonError = e instanceof Error && e.message.includes('Invalid JSON format');

    if ((isMongoError || isSheetsError) && isJsonError) {
      logger.error('JSON parsing error:', {
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
