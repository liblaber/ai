import { NextRequest, NextResponse } from 'next/server';
import { requireUserAbility } from '~/auth/session';
import { PermissionAction, PermissionResource } from '@prisma/client';
import { createEnvironmentDataSource, getDataSource } from '~/lib/services/datasourceService';
import type { DataSourceProperty as SimpleDataSourceProperty } from '@liblab/data-access/utils/types';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId, userAbility } = await requireUserAbility(request);

  if (!userAbility.can(PermissionAction.create, PermissionResource.DataSource)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { id: dataSourceId } = await params;

  try {
    const formData = await request.formData();

    const environmentId = formData.get('environmentId') as string;
    const propertiesJson = formData.get('properties') as string;
    const properties = JSON.parse(propertiesJson) as SimpleDataSourceProperty[];

    if (!environmentId) {
      return NextResponse.json({ success: false, error: 'Environment ID is required' }, { status: 400 });
    }

    if (!properties?.length) {
      return NextResponse.json({ success: false, error: 'Properties are required' }, { status: 400 });
    }

    // Verify the data source exists and user has access
    const dataSource = await getDataSource({ id: dataSourceId });

    if (!dataSource) {
      return NextResponse.json({ success: false, error: 'Data source not found' }, { status: 404 });
    }

    const environmentDataSource = await createEnvironmentDataSource({
      dataSourceId,
      environmentId,
      properties,
      createdById: userId,
    });

    return NextResponse.json({ success: true, environmentDataSource });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create data source environment',
      },
      { status: 400 },
    );
  }
}
