import { json } from '@remix-run/cloudflare';
import { deleteDataSource, getDataSource, updateDataSource } from '~/lib/services/datasourceService';

export async function loader({ params }: { request: Request; params: { id: string } }) {
  const dataSource = await getDataSource(params.id);

  if (!dataSource) {
    return json({ success: false, error: 'Data source not found' }, { status: 404 });
  }

  return json({ success: true, dataSource });
}

export async function action({ request, params }: { request: Request; params: { id: string } }) {
  const dataSource = await getDataSource(params.id);

  if (!dataSource) {
    return json({ success: false, error: 'Data source not found' }, { status: 404 });
  }

  if (request.method === 'PUT') {
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const connectionString = formData.get('connectionString') as string;

    try {
      const updatedDataSource = await updateDataSource({ id: params.id, name, connectionString });

      return json({ success: true, dataSource: updatedDataSource });
    } catch (error) {
      return json(
        { success: false, error: error instanceof Error ? error.message : 'Failed to update data source' },
        { status: 400 },
      );
    }
  }

  if (request.method === 'DELETE') {
    await deleteDataSource(params.id);

    return json({ success: true });
  }

  return json({ success: false, error: 'Method not allowed' }, { status: 405 });
}
