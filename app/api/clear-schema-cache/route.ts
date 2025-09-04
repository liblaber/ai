import { NextRequest, NextResponse } from 'next/server';
import { clearSchemaCache } from '~/lib/schema';
import { getDatabaseUrl } from '~/lib/services/dataSourceService';
import { requireUserId } from '~/auth/session';
import { createScopedLogger } from '~/utils/logger';
import { z } from 'zod';

const logger = createScopedLogger('clear-schema-cache');

const clearSchemaCacheRequestSchema = z.object({
  dataSourceId: z.string().min(1, 'dataSourceId is required'),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId(request);

    const body = await request.json();
    const validationResult = clearSchemaCacheRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.errors[0]?.message || 'Invalid request data' },
        { status: 400 },
      );
    }

    const { dataSourceId } = validationResult.data;

    const connectionUrl = await getDatabaseUrl(userId, dataSourceId);

    if (!connectionUrl) {
      return NextResponse.json({ success: false, error: 'Data source not found' }, { status: 404 });
    }

    await clearSchemaCache(connectionUrl);

    return NextResponse.json({ success: true, message: 'Schema cache cleared successfully' });
  } catch (error) {
    logger.error('Error clearing schema cache:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
