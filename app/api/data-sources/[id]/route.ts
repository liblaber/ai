import { NextRequest, NextResponse } from 'next/server';
import {
  deleteDataSource,
  getConversationCount,
  getEnvironmentDataSource,
  updateDataSource,
} from '~/lib/services/dataSourceService';
import { requireUserId } from '~/auth/session';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(request);

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const environmentId = searchParams.get('environmentId');

  if (!environmentId) {
    return NextResponse.json({ success: false, error: 'Environment ID is required' }, { status: 400 });
  }

  const environmentDataSource = await getEnvironmentDataSource(id, userId, environmentId);

  if (!environmentDataSource) {
    return NextResponse.json({ success: false, error: 'Data source not found' }, { status: 404 });
  }

  const conversationCount = await getConversationCount(id, userId);

  return NextResponse.json({ success: true, environmentDataSource, conversationCount });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(request);

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const environmentId = searchParams.get('environmentId');

  if (!environmentId) {
    return NextResponse.json({ success: false, error: 'Environment ID is required' }, { status: 400 });
  }

  const environmentDataSource = await getEnvironmentDataSource(id, userId, environmentId);

  if (!environmentDataSource) {
    return NextResponse.json({ success: false, error: 'Data source not found' }, { status: 404 });
  }

  const formData = await request.formData();
  const name = formData.get('name') as string;

  try {
    const updatedDataSource = await updateDataSource({ id, userId, name, connectionString: '' });

    return NextResponse.json({ success: true, dataSource: updatedDataSource });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update data source' },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(request);
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const environmentId = searchParams.get('environmentId');

  if (!environmentId) {
    return NextResponse.json({ success: false, error: 'Environment ID is required' }, { status: 400 });
  }

  const environmentDataSource = await getEnvironmentDataSource(id, userId, environmentId);

  if (!environmentDataSource) {
    return NextResponse.json({ success: false, error: 'Data source not found' }, { status: 404 });
  }

  await deleteDataSource(id, userId);

  return NextResponse.json({ success: true });
}
