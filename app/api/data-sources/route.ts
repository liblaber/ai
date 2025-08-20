import { NextRequest, NextResponse } from 'next/server';
import { createDataSource, getDataSources } from '~/lib/services/datasourceService';
import { requireUserAbility } from '~/auth/session';
import { DataSourceType, PermissionAction, PermissionResource } from '@prisma/client';

export async function GET(request: NextRequest) {
  const { userAbility } = await requireUserAbility(request);

  if (!userAbility.can(PermissionAction.read, PermissionResource.DataSource)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const dataSources = await getDataSources(userAbility);

  return NextResponse.json({ success: true, dataSources });
}

export async function POST(request: NextRequest) {
  const { userId, userAbility } = await requireUserAbility(request);

  if (!userAbility.can(PermissionAction.create, PermissionResource.DataSource)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const formData = await request.formData();
  const name = formData.get('name') as string;
  const type = formData.get('type') as DataSourceType;

  const propertiesJson = formData.get('properties') as string;
  const properties = JSON.parse(propertiesJson);

  try {
    const dataSource = await createDataSource({
      name,
      type,
      properties,
      createdById: userId,
    });

    console.log('Created Data Source:', dataSource);

    return NextResponse.json({ success: true, dataSource });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create data source' },
      { status: 400 },
    );
  }
}
