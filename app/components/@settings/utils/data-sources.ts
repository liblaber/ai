export async function getDataSourceUrl(dataSourceId: string, environmentId: string) {
  const response = await fetch(`/api/data-sources/${dataSourceId}/url?environmentId=${environmentId}`);

  if (!response.ok) {
    throw new Error('Failed to get connection string');
  }

  const data = (await response.json()) as { success: boolean; url?: string; error?: string };

  if (!data.success || !data.url) {
    throw new Error(data.error || 'No connection string available');
  }

  return data.url;
}
