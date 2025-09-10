import { NextRequest, NextResponse } from 'next/server';
import { requireUserAbility } from '~/auth/session';
import { DataSourceType, PermissionAction, PermissionResource } from '@prisma/client';
import { createDataSource, getEnvironmentDataSources } from '~/lib/services/datasourceService';

export async function GET(request: NextRequest) {
  const { userAbility } = await requireUserAbility(request);

  if (userAbility.cannot(PermissionAction.read, PermissionResource.DataSource)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const environmentDataSources = await getEnvironmentDataSources(userAbility);

  return NextResponse.json({ success: true, environmentDataSources });
}

export async function POST(request: NextRequest) {
  const { userId, userAbility } = await requireUserAbility(request);

  if (!userAbility.can(PermissionAction.create, PermissionResource.DataSource)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const formData = await request.formData();
  const name = formData.get('name') as string;
  const type = formData.get('type') as DataSourceType;
  const environmentId = formData.get('environmentId') as string;

  if (!environmentId) {
    return NextResponse.json({ success: false, error: 'Environment ID is required' }, { status: 400 });
  }

  const propertiesJson = formData.get('properties') as string;
  const properties = JSON.parse(propertiesJson);

  try {
    const dataSource = await createDataSource({
      name,
      type,
      properties,
      environmentId,
      createdById: userId,
    });

    return NextResponse.json({ success: true, dataSource });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create data source' },
      { status: 400 },
    );
  }
}
