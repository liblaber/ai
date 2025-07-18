import { NextRequest, NextResponse } from 'next/server';
import { createDataSource, getDataSources } from '~/lib/services/datasourceService';
import { requireUserId } from '~/auth/session';

export async function GET(request: NextRequest) {
  const userId = await requireUserId(request);
  const dataSources = await getDataSources(userId);

  return NextResponse.json({ success: true, dataSources });
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId(request);

  const formData = await request.formData();
  const connectionString = formData.get('connectionString') as string;
  const name = formData.get('name') as string;

  try {
    const dataSource = await createDataSource({
      name,
      connectionString,
      userId,
    });

    return NextResponse.json({ success: true, dataSource });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create data source' },
      { status: 400 },
    );
  }
}
