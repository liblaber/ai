import { decryptData, encryptData } from '@liblab/encryption/encryption';
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '~/lib/database';
import { env } from '~/env';
import { z } from 'zod';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('execute-query');

const encryptedRequestSchema = z.object({
  encryptedData: z.string().min(1, 'Encrypted data is required'),
});

const decryptedQuerySchema = z.object({
  query: z.string().min(1, 'Query is required'),
  databaseUrl: z.string().min(1, 'Database URL is required'),
  params: z.array(z.any()).optional(),
});

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const bodyValidation = encryptedRequestSchema.safeParse(body);

    if (!bodyValidation.success) {
      return NextResponse.json(
        { error: bodyValidation.error.errors[0]?.message || 'Invalid request format' },
        { status: 400 },
      );
    }

    const encryptionKey = env.server.ENCRYPTION_KEY;

    if (!encryptionKey) {
      return NextResponse.json({ error: 'Encryption key not found' }, { status: 500 });
    }

    const decryptedData = decryptData(env.server.ENCRYPTION_KEY, bodyValidation.data.encryptedData);
    const decryptedBody = JSON.parse(decryptedData.toString());

    const decryptedValidation = decryptedQuerySchema.safeParse(decryptedBody);

    if (!decryptedValidation.success) {
      return NextResponse.json(
        { error: decryptedValidation.error.errors[0]?.message || 'Invalid decrypted data format' },
        { status: 400 },
      );
    }

    const { query, databaseUrl, params } = decryptedValidation.data;

    const resultData = await executeQuery(databaseUrl, query, params);
    const dataBuffer = Buffer.from(JSON.stringify(resultData));

    const encryptedResponse = encryptData(env.server.ENCRYPTION_KEY, dataBuffer);

    return NextResponse.json({ encryptedData: encryptedResponse });
  } catch (error: any) {
    logger.error('Failed to execute query', error);

    // Handle validation errors
    if (error?.message) {
      const encryptedError = encryptData(
        env.server.ENCRYPTION_KEY,
        Buffer.from(
          JSON.stringify({
            success: false,
            error: 'Query execution failed',
            details: error.message,
          }),
        ),
      );

      return NextResponse.json(
        { encryptedData: encryptedError },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json(
      { error: `Failed to execute query: ${error?.message}` },
      {
        status: 500,
      },
    );
  }
}
