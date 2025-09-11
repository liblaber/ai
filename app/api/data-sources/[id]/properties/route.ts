import { NextRequest, NextResponse } from 'next/server';
import { PermissionAction, PermissionResource } from '@prisma/client';
import { subject } from '@casl/ability';
import { requireUserAbility } from '~/auth/session';
import { getDataSourceProperties, getDataSourceType } from '~/lib/services/datasourceService';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userAbility } = await requireUserAbility(request);

  const { id } = await params;
  const { searchParams } = new URL(request.url);

  const environmentId = searchParams.get('environmentId');

  if (!environmentId) {
    return NextResponse.json({ success: false, error: 'Environment ID is required' }, { status: 400 });
  }

  if (
    userAbility.cannot(PermissionAction.read, subject(PermissionResource.DataSource, { id })) &&
    userAbility.cannot(PermissionAction.read, subject(PermissionResource.Environment, { id: environmentId }))
  ) {
    throw new Response('Forbidden', {
      status: 403,
      statusText: 'Forbidden',
    });
  }

  const dataSourceType = await getDataSourceType(id);

  if (!dataSourceType) {
    return NextResponse.json({ success: false, error: 'Data source type not found' }, { status: 404 });
  }

  const dataSourceProperties = await getDataSourceProperties(id, environmentId);

  if (!dataSourceProperties) {
    return NextResponse.json({ success: false, error: 'Data source properties not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    properties: dataSourceProperties,
    dataSourceType,
  });
}
