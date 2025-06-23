import { decryptData, encryptData } from '@liblab/encryption/encryption';
import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { executeQuery } from '~/lib/database';

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

    const decryptedData = decryptData(process.env.ENCRYPTION_KEY as string, body.encryptedData);
    const decryptedBody = JSON.parse(decryptedData.toString());
    const { query, databaseUrl, params } = decryptedBody;

    if (!databaseUrl) {
      return json({ error: 'Database connection URL must be provided in the request body' }, { status: 400 });
    }

    if (!query) {
      return json({ error: 'Query must be provided in the request body' }, { status: 400 });
    }

    const resultData = await executeQuery(databaseUrl, query, params);

    const dataBuffer = Buffer.from(JSON.stringify(resultData));

    const encryptedResponse = encryptData(process.env.ENCRYPTION_KEY as string, dataBuffer);

    return json({ encryptedData: encryptedResponse }, { headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('Failed to execute query', error);
    return json({ error: `Failed to execute query: ${error?.message}` }, { status: 500 });
  }
};
