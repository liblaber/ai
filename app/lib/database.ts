import { DataAccessor } from '@liblab/data-access/dataAccessor';
import { logger } from '~/utils/logger';

export async function executeQuery(connectionUrl: string, query: string, params?: string[]): Promise<any[]> {
  const dataAccessor = DataAccessor.getAccessor(connectionUrl);
  await dataAccessor.initialize(connectionUrl);
  dataAccessor.guardAgainstMaliciousQuery(query);

  try {
    return dataAccessor.executeQuery(query, params);
  } catch (e) {
    logger.error('Error executing query:', { error: e, query });
    throw e;
  } finally {
    await dataAccessor.close();
  }
}
