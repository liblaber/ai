import { NextRequest, NextResponse } from 'next/server';
import { requireUserAbility } from '~/auth/session';
import { createEnvironmentDataSource } from '~/lib/services/datasourceService';
import { type DataSourceProperty, DataSourcePropertyType } from '@liblab/data-access/utils/types';
import { z } from 'zod';
import { PermissionAction, PermissionResource } from '@prisma/client';

// zod schema for the request body
const dataSourcePropertiesSchema = z.array(
  z.object({
    type: z.nativeEnum(DataSourcePropertyType),
    value: z.string().nullable(),
  }),
);

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId, userAbility } = await requireUserAbility(request);

  if (!userAbility.can(PermissionAction.create, PermissionResource.DataSource)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { id: dataSourceId } = await params;

  const formData = await request.formData();
  const environmentId = formData.get('environmentId') as string;
  const propertiesJson = formData.get('properties') as string;

  if (!environmentId) {
    return NextResponse.json({ success: false, error: 'Environment ID is required' }, { status: 400 });
  }

  let properties: DataSourceProperty[];

  try {
    properties = propertiesJson ? JSON.parse(propertiesJson) : [];
    dataSourcePropertiesSchema.parse(properties);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid properties payload' }, { status: 400 });
  }

  try {
    const result = await createEnvironmentDataSource({
      dataSourceId,
      environmentId,
      properties,
      createdById: userId,
    });

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create environment data source' },
      { status: 400 },
    );
  }
}
