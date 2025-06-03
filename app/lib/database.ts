import { DataAccessor } from '@liblab/data-access/dataAccessor';

export async function executeQuery(connectionUrl: string, query: string, params?: string[]): Promise<any[]> {
  const dataAccessor = DataAccessor.getAccessor(connectionUrl);
  dataAccessor.guardAgainstMaliciousQuery(query);

  return dataAccessor.executeQuery(connectionUrl, query, params);
}
