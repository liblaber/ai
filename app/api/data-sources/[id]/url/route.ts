import { NextRequest, NextResponse } from 'next/server';
import { getDataSourceProperties } from '~/lib/services/dataSourceService';
import { requireUserId } from '~/auth/session';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(request);
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const environmentId = searchParams.get('environmentId');

  if (!environmentId) {
    return NextResponse.json({ success: false, error: 'Environment ID is required' }, { status: 400 });
  }

  try {
    const url = await getDataSourceProperties(userId, id, environmentId);
    return NextResponse.json({ url, success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get database URL' },
      { status: 404 },
    );
  }
}
