import { NextRequest, NextResponse } from 'next/server';
import { createDataSource, getEnvironmentDataSources } from '~/lib/services/dataSourceService';
import { requireUserAbility } from '~/auth/session';
import { PermissionAction, PermissionResource } from '@prisma/client';

export async function GET(request: NextRequest) {
  const { userAbility } = await requireUserAbility(request);

  if (!userAbility.can(PermissionAction.read, PermissionResource.DataSource)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const environmentDataSources = await getEnvironmentDataSources();

  return NextResponse.json({ success: true, environmentDataSources });
}

export async function POST(request: NextRequest) {
  const { userId, userAbility } = await requireUserAbility(request);

  if (!userAbility.can(PermissionAction.create, PermissionResource.DataSource)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const formData = await request.formData();
  const connectionString = formData.get('connectionString') as string;
  const name = formData.get('name') as string;
  const environmentId = formData.get('environmentId') as string;

  if (!environmentId) {
    return NextResponse.json({ success: false, error: 'Environment ID is required' }, { status: 400 });
  }

  try {
    const dataSource = await createDataSource({
      name,
      userId,
      environmentId,
      connectionString,
    });

    return NextResponse.json({ success: true, dataSource });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create data source' },
      { status: 400 },
    );
  }
}
