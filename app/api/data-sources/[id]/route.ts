import { NextRequest, NextResponse } from 'next/server';
import {
  deleteDataSource,
  getConversationCount,
  getEnvironmentDataSource,
  updateDataSource,
} from '~/lib/services/datasourceService';
import { subject } from '@casl/ability';
import { requireUserAbility } from '~/auth/session';
import { DataSourceType, PermissionAction, PermissionResource } from '@prisma/client';
import type { DataSourceProperty } from '@liblab/data-access/utils/types';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userAbility, userId } = await requireUserAbility(request);

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const environmentId = searchParams.get('environmentId');

  if (!environmentId) {
    return NextResponse.json({ success: false, error: 'Environment ID is required' }, { status: 400 });
  }

  const environmentDataSource = await getEnvironmentDataSource(id, environmentId);

  if (!environmentDataSource) {
    return NextResponse.json({ success: false, error: 'Data source not found' }, { status: 404 });
  }

  if (
    userAbility.cannot(
      PermissionAction.read,
      subject(PermissionResource.DataSource, environmentDataSource.dataSource),
    ) &&
    userAbility.cannot(
      PermissionAction.read,
      subject(PermissionResource.Environment, { id: environmentDataSource.environmentId }),
    )
  ) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const conversationCount = await getConversationCount(id, userId);

  return NextResponse.json({ success: true, environmentDataSource, conversationCount });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userAbility, userId } = await requireUserAbility(request);

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const environmentId = searchParams.get('environmentId');

  if (!environmentId) {
    return NextResponse.json({ success: false, error: 'Environment ID is required' }, { status: 400 });
  }

  const environmentDataSource = await getEnvironmentDataSource(id, environmentId);

  if (!environmentDataSource) {
    return NextResponse.json({ success: false, error: 'Data source not found' }, { status: 404 });
  }

  if (
    userAbility.cannot(
      PermissionAction.update,
      subject(PermissionResource.DataSource, environmentDataSource.dataSource),
    ) &&
    userAbility.cannot(
      PermissionAction.update,
      subject(PermissionResource.Environment, { id: environmentDataSource.environmentId }),
    )
  ) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const formData = await request.formData();
  const name = formData.get('name') as string;
  const type = formData.get('type') as DataSourceType;
  const propertiesJson = formData.get('properties') as string;
  const properties = JSON.parse(propertiesJson) as DataSourceProperty[];

  try {
    const updatedDataSource = await updateDataSource({
      id,
      name,
      type,
      properties,
      userId,
    });

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
  const { searchParams } = new URL(request.url);
  const environmentId = searchParams.get('environmentId');

  if (!environmentId) {
    return NextResponse.json({ success: false, error: 'Environment ID is required' }, { status: 400 });
  }

  const environmentDataSource = await getEnvironmentDataSource(id, environmentId);

  if (!environmentDataSource) {
    return NextResponse.json({ success: false, error: 'Data source not found' }, { status: 404 });
  }

  if (
    userAbility.cannot(
      PermissionAction.delete,
      subject(PermissionResource.DataSource, environmentDataSource.dataSource),
    ) &&
    userAbility.cannot(
      PermissionAction.delete,
      subject(PermissionResource.Environment, { id: environmentDataSource.environmentId }),
    )
  ) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  await deleteDataSource(id);

  return NextResponse.json({ success: true });
}
