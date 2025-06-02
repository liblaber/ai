import { executePostgresQuery } from '~/lib/database';
import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { decryptData, encryptData } from '~/lib/encryption';

interface EncryptedRequestBody {
  encryptedData: string;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = (await request.json()) as EncryptedRequestBody;

    const encryptionKey = process.env.ENCRYPTION_KEY;

    if (!encryptionKey) {
      return json({ error: 'Encryption key not found' }, { status: 500 });
    }

    const decryptedBody = decryptData(body.encryptedData);
    const { query, databaseUrl, params } = decryptedBody;

    if (!databaseUrl) {
      return json({ error: 'Database connection URL must be provided in the request body' }, { status: 400 });
    }

    if (!query) {
      return json({ error: 'Query must be provided in the request body' }, { status: 400 });
    }

    const resultData = await executePostgresQuery(databaseUrl, query, params);

    const encryptedResponse = encryptData(resultData);

    return json({ encryptedData: encryptedResponse }, { headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('Failed to execute query', error);
    return json({ error: `Failed to execute query: ${error?.message}` }, { status: 500 });
  }
};
