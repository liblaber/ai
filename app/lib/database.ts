import { logger } from '~/utils/logger';
import { DataSourcePluginManager } from '~/lib/plugins/data-access/data-access-plugin-manager';

export async function executeQuery(connectionUrl: string, query: string, params?: string[]): Promise<any[]> {
  const dataAccessor = await DataSourcePluginManager.getAccessor(connectionUrl);

  try {
    await dataAccessor.initialize(connectionUrl);

    // Enhanced logging for Google Sheets JSON parsing issues
    const isSheetsError =
      connectionUrl.startsWith('sheets://') || connectionUrl.startsWith('https://docs.google.com/spreadsheets/');

    if (isSheetsError) {
      console.log('[Database] Google Sheets query execution:', {
        queryType: typeof query,
        queryLength: query.length,
        firstChars: query.substring(0, 100),
        queryPreview: query.length > 200 ? query.substring(0, 200) + '...' : query,
        connectionUrl: connectionUrl.substring(0, 50) + '...',
      });
    }

    dataAccessor.guardAgainstMaliciousQuery(query);

    return await dataAccessor.executeQuery(query, params);
  } catch (e) {
    // Enhanced error logging for MongoDB and Google Sheets JSON parsing issues
    const isMongoError = connectionUrl.startsWith('mongodb');
    const isSheetsError =
      connectionUrl.startsWith('sheets://') || connectionUrl.startsWith('https://docs.google.com/spreadsheets/');
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
