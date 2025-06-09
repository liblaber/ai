import { prisma } from '~/lib/prisma';
import { json } from '@remix-run/cloudflare';
import { getInfisicalClient } from '~/lib/vault/client';
import { requireUserId } from '~/session';
import { env } from '~/lib/config/env';

export async function action({ request }: { request: Request }) {
  const userId = await requireUserId(request);

  if (request.method === 'POST') {
    try {
      const existingSampleDatabase = await prisma.dataSource.findFirst({
        where: {
          userId,
          name: 'Sample Database',
        },
      });

      if (existingSampleDatabase) {
        return json({ success: false, error: 'Sample database already exists' }, { status: 400 });
      }

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

      const vaultClient = await getInfisicalClient();
      const secretName = `example-db-password-${userId}`;

      await vaultClient.secrets().createSecret(secretName, {
        environment: env.INFISICAL_ENVIRONMENT!,
        projectId: env.INFISICAL_PROJECT_ID!,
        secretValue: exampleDbConfig.password,
      });

      const dataSource = await prisma.dataSource.create({
        data: {
          name: 'Sample Database',
          type: 'postgresql',
          host: exampleDbConfig.host,
          port: exampleDbConfig.port,
          username: exampleDbConfig.username,
          database: exampleDbConfig.database,
          secretName,
          userId,
        },
      });

      return json({ success: true, dataSource });
    } catch (error: any) {
      // Check if this is a "secret already exists" error from Infisical
      if (error?.message?.includes('Secret already exist')) {
        console.error('Sample database already exists', error);
        return json({ success: false, error: 'Sample database already exists' }, { status: 400 });
      }

      console.error('Error creating Sample database:', error);

      return json({ success: false, error: 'Failed to create Sample database' }, { status: 500 });
    }
  }

  return json({ success: false, error: 'Method not allowed' }, { status: 405 });
}
