import { NextRequest, NextResponse } from 'next/server';
import { requireUserAbility } from '~/auth/session';
import { getDataSourceProperties, getDataSourceType } from '~/lib/services/datasourceService';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userAbility } = await requireUserAbility(request);

  const { id } = await params;
  const { searchParams } = new URL(request.url);

  if (!userAbility.can('read', 'DataSource')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const environmentId = searchParams.get('environmentId');

  if (!environmentId) {
    return NextResponse.json({ success: false, error: 'Environment ID is required' }, { status: 400 });
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
