import { NextRequest, NextResponse } from 'next/server';
import {
  deleteDataSource,
  getConversationCount,
  getDataSource,
  updateDataSource,
} from '~/lib/services/datasourceService';
import { subject } from '@casl/ability';
import { requireUserAbility } from '~/auth/session';
import { DataSourceType, PermissionAction, PermissionResource } from '@prisma/client';
import { logger } from '~/utils/logger';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userAbility, userId } = await requireUserAbility(request);

  const { id } = await params;

  const dataSource = await getDataSource({ id });

  if (!dataSource) {
    return NextResponse.json({ success: false, error: 'Data source not found' }, { status: 404 });
  }

  const environmentIds = dataSource.environments.map((dataSourceEnvironment) => dataSourceEnvironment.environmentId);

  const canAccessEveryEnvironment = environmentIds.every((envId) =>
    userAbility.can(PermissionAction.read, subject(PermissionResource.Environment, { id: envId })),
  );

  if (
    userAbility.cannot(PermissionAction.read, subject(PermissionResource.DataSource, dataSource)) &&
    !canAccessEveryEnvironment
  ) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const conversationCount = await getConversationCount(id, userId);

  return NextResponse.json({ success: true, dataSource, conversationCount });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userAbility } = await requireUserAbility(request);

  const { id } = await params;

  const dataSource = await getDataSource({ id });

  if (!dataSource) {
    return NextResponse.json({ success: false, error: 'Data source not found' }, { status: 404 });
  }

  const environmentIds = dataSource.environments.map((dataSourceEnvironment) => dataSourceEnvironment.environmentId);

  const canUpdateEveryEnvironment = environmentIds.every((envId) =>
    userAbility.can(PermissionAction.update, subject(PermissionResource.Environment, { id: envId })),
  );

  if (
    userAbility.cannot(PermissionAction.update, subject(PermissionResource.DataSource, dataSource)) &&
    !canUpdateEveryEnvironment
  ) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
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
  const { userAbility } = await requireUserAbility(request);
  const { id } = await params;

  const dataSource = await getDataSource({ id });

  if (!dataSource) {
    return NextResponse.json({ success: false, error: 'Data source not found' }, { status: 404 });
  }

  const environmentIds = dataSource.environments.map((dataSourceEnvironment) => dataSourceEnvironment.environmentId);

  const canDeleteEveryEnvironment = environmentIds.every((envId) =>
    userAbility.can(PermissionAction.delete, subject(PermissionResource.Environment, { id: envId })),
  );

  if (
    userAbility.cannot(PermissionAction.delete, subject(PermissionResource.DataSource, dataSource)) &&
    !canDeleteEveryEnvironment
  ) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    await deleteDataSource(id);
  } catch (error) {
    logger.error('Error deleting data source:', error);

    return NextResponse.json({ success: false, error: 'Failed to delete data source' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
