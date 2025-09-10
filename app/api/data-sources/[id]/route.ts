import { NextRequest, NextResponse } from 'next/server';
import {
  deleteDataSource,
  getConversationCount,
  getDataSource,
  getEnvironmentDataSource,
  updateDataSource,
} from '~/lib/services/datasourceService';
import { requireUserAbility, requireUserId } from '~/auth/session';
import { DataSourceType, PermissionAction, PermissionResource } from '@prisma/client';

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
  const { userId, userAbility } = await requireUserAbility(request);

  if (!userAbility.can(PermissionAction.update, PermissionResource.DataSource)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const dataSource = await getDataSource({ id, createdById: userId });

  if (!dataSource) {
    return NextResponse.json({ success: false, error: 'Data source not found' }, { status: 404 });
  }

  const formData = await request.formData();
  const name = formData.get('name') as string;
  const type = formData.get('type') as DataSourceType;

  try {
    const updatedDataSource = await updateDataSource(id, { name, type });

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
