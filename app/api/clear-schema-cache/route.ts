import { NextRequest, NextResponse } from 'next/server';
import { clearSchemaCache } from '~/lib/schema';
import { getDatabaseUrl } from '~/lib/services/datasourceService';
import { requireUserId } from '~/auth/session';

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId(request);

    const { dataSourceId } = (await request.json()) as { dataSourceId?: string };

    if (!dataSourceId) {
      return NextResponse.json({ error: 'dataSourceId is required' }, { status: 400 });
    }

    const connectionUrl = await getDatabaseUrl(userId, dataSourceId);

    if (!connectionUrl) {
      return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
    }

    await clearSchemaCache(connectionUrl);

    return NextResponse.json({ success: true, message: 'Schema cache cleared successfully' });
  } catch (error) {
    console.error('Error clearing schema cache:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
