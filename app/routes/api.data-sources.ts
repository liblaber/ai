import { json } from '@remix-run/cloudflare';
import { createDataSource, getDataSources } from '~/lib/services/datasourceService';

export async function loader() {
  const dataSources = await getDataSources();

  return json({ success: true, dataSources });
}

export async function action({ request }: { request: Request }) {
  if (request.method === 'POST') {
    const formData = await request.formData();
    const connectionString = formData.get('connectionString') as string;
    const name = formData.get('name') as string;

    try {
      const dataSource = await createDataSource({
        name,
        connectionString,
      });

      return json({ success: true, dataSource });
    } catch (error) {
      return json(
        { success: false, error: error instanceof Error ? error.message : 'Failed to create data source' },
        { status: 400 },
      );
    }
  }

  return json({ success: false, error: 'Method not allowed' }, { status: 405 });
}
