import { json } from '@remix-run/cloudflare';
import { DataAccessor } from '@liblab/data-access/dataAccessor';

export async function action({ request }: { request: Request }) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const formData = await request.formData();
    const databaseUrl = formData.get('connectionString') as string;

    if (!databaseUrl) {
      return json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    try {
      const accessor = DataAccessor.getAccessor(databaseUrl);
      accessor.validate(databaseUrl);

      const isConnected = await accessor.testConnection(databaseUrl);

      if (isConnected) {
        return json({ success: true, message: 'Connection successful' });
      } else {
        return json(
          {
            success: false,
            message: 'Failed to connect to database',
          },
          { status: 400 },
        );
      }
    } catch (error) {
      return json(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to connect to database',
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error('Error testing connection:', error);
    return json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
