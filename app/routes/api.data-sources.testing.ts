import { json } from '@remix-run/cloudflare';
import pg from 'pg';
import { getSslModeConfig } from '~/utils/sslModeConfig';

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
    const sslMode = formData.get('sslMode') as string;

    if (!host || !port || !username || !password || !type) {
      return json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    if (type === 'postgres') {
      const client = new pg.Client({
        host,
        port,
        user: username,
        password: decodeURIComponent(password),
        database,
        ssl: getSslModeConfig(sslMode),
      });

      try {
        await client.connect();
        await client.query('SELECT 1');
        await client.end();

        return json({ success: true, message: 'Connection successful' });
      } catch (error) {
        return json(
          {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to connect to database',
          },
          { status: 400 },
        );
      }
    }

    return json({ error: 'Unsupported database type' }, { status: 400 });
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
