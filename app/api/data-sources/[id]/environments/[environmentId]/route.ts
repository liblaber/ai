import { NextRequest, NextResponse } from 'next/server';
import { requireUserAbility } from '~/auth/session';
import { PermissionAction, PermissionResource } from '@prisma/client';
import { deleteDataSourceEnvironment, updateEnvironmentDataSourceProperties } from '~/lib/services/datasourceService';
import type { DataSourceProperty as SimpleDataSourceProperty } from '@liblab/data-access/utils/types';
import { logger } from '~/utils/logger';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; environmentId: string }> },
) {
  const { userId, userAbility } = await requireUserAbility(request);

  if (!userAbility.can(PermissionAction.update, PermissionResource.DataSource)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { id: dataSourceId, environmentId } = await params;

  try {
    const formData = await request.formData();

    const propertiesJson = formData.get('properties') as string;
    const properties = JSON.parse(propertiesJson) as SimpleDataSourceProperty[];

    if (!properties?.length) {
      return NextResponse.json({ success: false, error: 'Properties are required' }, { status: 400 });
    }

    await updateEnvironmentDataSourceProperties({
      dataSourceId,
      environmentId,
      properties,
      userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to update data source properties:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update data source properties',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; environmentId: string }> },
) {
  const { userAbility } = await requireUserAbility(request);

  if (!userAbility.can(PermissionAction.delete, PermissionResource.DataSource)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id: dataSourceId, environmentId } = await params;

    await deleteDataSourceEnvironment(dataSourceId, environmentId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete data source environment:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete data source environment' }, { status: 500 });
  }
}
