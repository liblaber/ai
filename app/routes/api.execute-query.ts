import { executePostgresQuery } from '~/lib/database';
import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { env } from '~/lib/config/env';

interface RequestBody {
  query: string;
  params?: string[];
  databaseUrl: string;
}

const corsHeaders: Record<string, string> =
  env.VITE_ENV_NAME !== 'local'
    ? {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      }
    : {};

export const loader = async ({ request }: ActionFunctionArgs) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  return new Response('Method not allowed', {
    status: 405,
    headers: corsHeaders,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    if (request.method !== 'POST') {
      return json(
        { error: 'Method not allowed' },
        {
          status: 405,
          headers: corsHeaders,
        },
      );
    }

    const body = (await request.json()) as RequestBody;
    const { query, databaseUrl, params } = body;

    if (!databaseUrl) {
      return json(
        { error: 'Database connection URL must be provided in the request body' },
        {
          status: 400,
          headers: corsHeaders,
        },
      );
    }

    if (!query) {
      return json(
        { error: 'Query must be provided in the request body' },
        {
          status: 400,
          headers: corsHeaders,
        },
      );
    }

    const resultData = await executePostgresQuery(databaseUrl, query, params);

    return json(resultData, {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    return json(
      { error: `Failed to execute query: ${error?.message}` },
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
};
