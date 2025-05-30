import { prisma } from '~/lib/prisma';
import { json } from '@remix-run/cloudflare';
import { env } from '~/lib/config/env';

export async function action({ request }: { request: Request }) {
  if (request.method === 'POST') {
    try {
      const exampleDbConfig = {
        host: env.EXAMPLE_DB_HOST,
        port: parseInt(env.EXAMPLE_DB_PORT || '5432'),
        username: env.EXAMPLE_DB_USER,
        database: env.EXAMPLE_DB_DATABASE,
        password: env.EXAMPLE_DB_PASSWORD,
      };

      if (
        !exampleDbConfig.host ||
        !exampleDbConfig.username ||
        !exampleDbConfig.database ||
        !exampleDbConfig.password
      ) {
        return json({ success: false, error: 'Missing required example database configuration' }, { status: 400 });
      }

      const dataSource = await prisma.dataSource.create({
        data: {
          name: 'Sample Database',
          type: 'postgresql',
          host: exampleDbConfig.host,
          port: exampleDbConfig.port,
          username: exampleDbConfig.username,
          database: exampleDbConfig.database,
          password: exampleDbConfig.password,
        },
      });

      return json({ success: true, dataSource });
    } catch (error) {
      console.error('Error creating example datasource:', error);
      return json({ success: false, error: 'Failed to create example datasource' }, { status: 500 });
    }
  }

  return json({ success: false, error: 'Method not allowed' }, { status: 405 });
}
