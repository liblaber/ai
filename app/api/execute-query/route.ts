import { decryptData, encryptData } from '@liblab/encryption/encryption';
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '~/lib/database';
import '~/lib/config/env';

interface EncryptedRequestBody {
  encryptedData: string;
}

// CORS headers for all origins
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as EncryptedRequestBody;

    const encryptionKey = process.env.ENCRYPTION_KEY;

    if (!encryptionKey) {
      return NextResponse.json(
        { error: 'Encryption key not found' },
        {
          status: 500,
          headers: corsHeaders,
        },
      );
    }

    const decryptedData = decryptData(process.env.ENCRYPTION_KEY as string, body.encryptedData);
    const decryptedBody = JSON.parse(decryptedData.toString());
    const { query, databaseUrl, params } = decryptedBody;

    if (!databaseUrl) {
      return NextResponse.json(
        { error: 'Database connection URL must be provided in the request body' },
        {
          status: 400,
          headers: corsHeaders,
        },
      );
    }

    if (!query) {
      return NextResponse.json(
        { error: 'Query must be provided in the request body' },
        {
          status: 400,
          headers: corsHeaders,
        },
      );
    }

    const resultData = await executeQuery(databaseUrl, query, params);

    const dataBuffer = Buffer.from(JSON.stringify(resultData));

    const encryptedResponse = encryptData(process.env.ENCRYPTION_KEY as string, dataBuffer);

    return NextResponse.json(
      { encryptedData: encryptedResponse },
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      },
    );
  } catch (error: any) {
    console.error('Failed to execute query', error);
    return NextResponse.json(
      { error: `Failed to execute query: ${error?.message}` },
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
}
