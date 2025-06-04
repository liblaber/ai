import { json } from '@remix-run/cloudflare';
import { type SSLMode } from '~/types/database';
import { getDataSources, createDataSource } from '~/lib/services/datasourceService';

export async function loader() {
  const dataSources = await getDataSources();

  return json({ success: true, dataSources });
}

export async function action({ request }: { request: Request }) {
  if (request.method === 'POST') {
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;
    const host = formData.get('host') as string;
    const port = parseInt(formData.get('port') as string);
    const username = formData.get('username') as string;
    const password = decodeURIComponent(formData.get('password') as string);
    const database = formData.get('database') as string;
    const sslMode = formData.get('sslMode') as SSLMode;

    try {
      const dataSource = await createDataSource({
        name,
        type,
        host,
        port,
        username,
        password,
        database,
        sslMode,
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
