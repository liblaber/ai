import type { DataSourcePropertyResponse } from '~/components/chat/Chat.client';

export async function getDataSourceProperties(
  dataSourceId: string,
  environmentId: string,
): Promise<DataSourcePropertyResponse[]> {
  const response = await fetch(`/api/data-sources/${dataSourceId}/properties?environmentId=${environmentId}`);

  if (!response.ok) {
    throw new Error('Failed to get connection string');
  }

  const data = (await response.json()) as {
    success: boolean;
    properties?: DataSourcePropertyResponse[];
    error?: string;
  };

  if (!data.success || !data.properties) {
    throw new Error(data.error || 'No data source properties available');
  }

  return data.properties;
}
