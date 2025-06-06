import { json } from '@remix-run/cloudflare';
import { DataAccessor } from '@liblab/data-access/dataAccessor';
import { prisma } from '~/lib/prisma';

export async function action({ request }: { request: Request }) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const formData = await request.formData();
    const host = formData.get('host') as string;
    const port = parseInt(formData.get('port') as string);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const type = formData.get('type') as string;
    const database = formData.get('database') as string;
    const id = formData.get('id') as string;
    const sslMode = formData.get('sslMode') as string;

    if (!host || !port || !username || !type || !(password || id)) {
      return json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const passwordValue = decodeURIComponent(password ?? '') || (await getPassword(id));

    const databaseUrl = `${type}://${username}:${encodeURIComponent(passwordValue)}@${host}:${port}/${database}?sslmode=${sslMode || 'disable'}`;

    try {
      const accessor = DataAccessor.getAccessor(databaseUrl);
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
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

async function getPassword(dataSourceId: string): Promise<string> {
  const dataSource = await prisma.dataSource.findUnique({
    where: { id: dataSourceId },
    select: {
      password: true,
    },
  });

  if (!dataSource) {
    throw new Error('Data source not found or password retrieval failed');
  }

  return dataSource.password;
}
