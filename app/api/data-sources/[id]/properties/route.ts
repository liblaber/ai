import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '~/auth/session';
import { getDataSource } from '~/lib/services/datasourceService';
import { DataSourceType } from '@prisma/client';
import { DataSourcePropertyType } from '~/lib/datasource';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(request);

  const { id } = await params;

  const dataSource = await getDataSource(id, userId);

  if (!dataSource) {
    return NextResponse.json({ success: false, error: 'Data source not found' }, { status: 404 });
  }

  // @depends Temporary until the new schema is in place that supports multiple properties per data source
  return NextResponse.json({
    success: true,
    properties: [
      {
        type:
          dataSource.type === DataSourceType.HUBSPOT
            ? DataSourcePropertyType.ACCESS_TOKEN
            : DataSourcePropertyType.CONNECTION_URL,
        value: dataSource.connectionString,
        dataSourceType: dataSource.type,
      },
    ],
  });
}
