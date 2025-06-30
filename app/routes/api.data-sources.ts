import { json } from '@remix-run/cloudflare';
import { createDataSource, getDataSources } from '~/lib/services/datasourceService';
import { requireUserId } from '~/auth/session';

export async function loader({ request }: { request: Request }) {
  const userId = await requireUserId(request);
  const dataSources = await getDataSources(userId);

  return json({ success: true, dataSources });
}

export async function action({ request }: { request: Request }) {
  const userId = await requireUserId(request);

  if (request.method === 'POST') {
    const formData = await request.formData();
    const connectionString = formData.get('connectionString') as string;
    const name = formData.get('name') as string;

    try {
      const dataSource = await createDataSource({
        name,
        connectionString,
        userId,
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
