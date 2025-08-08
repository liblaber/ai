import { decryptData, encryptData } from '@liblab/encryption/encryption';
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '~/lib/database';
import { env } from '~/env';

interface EncryptedRequestBody {
  encryptedData: string;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Expose-Headers': '*',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as EncryptedRequestBody;

    const encryptionKey = env.server.ENCRYPTION_KEY;

    if (!encryptionKey) {
      return NextResponse.json(
        { error: 'Encryption key not found' },
        {
          status: 500,
        },
      );
    }

    const decryptedData = decryptData(env.server.ENCRYPTION_KEY, body.encryptedData);
    const decryptedBody = JSON.parse(decryptedData.toString());
    const { query, databaseUrl, params } = decryptedBody;

    if (!databaseUrl) {
      return NextResponse.json(
        { error: 'Database connection URL must be provided in the request body' },
        {
          status: 400,
        },
      );
    }

    if (!query) {
      return NextResponse.json(
        { error: 'Query must be provided in the request body' },
        {
          status: 400,
        },
      );
    }

    const resultData = await executeQuery(databaseUrl, query, params);

    const dataBuffer = Buffer.from(JSON.stringify(resultData));

    const encryptedResponse = encryptData(env.server.ENCRYPTION_KEY, dataBuffer);

    return NextResponse.json(
      { encryptedData: encryptedResponse },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': '*',
        },
      },
    );
  } catch (error: any) {
    console.error('Failed to execute query', error);
    return NextResponse.json(
      { error: `Failed to execute query: ${error?.message}` },
      {
        status: 500,
      },
    );
  }
}
