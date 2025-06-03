import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { executeQuery } from '~/lib/database';

interface RequestBody {
  query: string;
  params?: string[];
  databaseUrl: string;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = (await request.json()) as RequestBody;
    const { query, databaseUrl, params } = body;

    if (!databaseUrl) {
      return json({ error: 'Database connection URL must be provided in the request body' }, { status: 400 });
    }

    if (!query) {
      return json({ error: 'Query must be provided in the request body' }, { status: 400 });
    }

    const resultData = await executeQuery(databaseUrl, query, params);

    return json(resultData, { headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('Failed to execute query', error);
    return json({ error: `Failed to execute query: ${error?.message}` }, { status: 500 });
  }
};
