import { NextRequest, NextResponse } from 'next/server';
import {
  deleteDataSource,
  getConversationCount,
  getDataSource,
  updateDataSource,
} from '~/lib/services/datasourceService';
import { requireUserId } from '~/auth/session';
import { DataSourceType } from '@prisma/client';
import type { DataSourceProperty } from '@liblab/data-access/utils/types';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(request);

  const { id } = await params;

  const dataSource = await getDataSource(id, userId);

  if (!dataSource) {
    return NextResponse.json({ success: false, error: 'Data source not found' }, { status: 404 });
  }

  const conversationCount = await getConversationCount(id, userId);

  return NextResponse.json({ success: true, dataSource, conversationCount });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(request);

  const { id } = await params;

  const dataSource = await getDataSource(id, userId);

  if (!dataSource) {
    return NextResponse.json({ success: false, error: 'Data source not found' }, { status: 404 });
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
  const userId = await requireUserId(request);
  const { id } = await params;

  const dataSource = await getDataSource(id, userId);

  if (!dataSource) {
    return NextResponse.json({ success: false, error: 'Data source not found' }, { status: 404 });
  }

  await deleteDataSource(id, userId);

  return NextResponse.json({ success: true });
}
