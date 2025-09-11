import { prisma } from '~/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '~/auth/session';
import { createSampleDataSource } from '~/lib/services/datasourceService';
import { z } from 'zod';

const createExampleDataSourceSchema = z.object({
  environmentId: z.string().min(1, 'Environment ID is required'),
});

export async function POST(request: NextRequest) {
  const userId = await requireUserId(request);

  try {
    const body = await request.json();
    const validationResult = createExampleDataSourceSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.errors[0]?.message || 'Invalid request data' },
        { status: 400 },
      );
    }

    const { environmentId } = validationResult.data;

    const existingSampleDatabase = await prisma.dataSource.findFirst({
      where: {
        createdById: userId,
        name: 'Sample Database',
      },
    });

    if (existingSampleDatabase) {
      return NextResponse.json({ success: false, error: 'Sample database already exists' }, { status: 400 });
    }

    const dataSource = await createSampleDataSource({
      createdById: userId,
      environmentId,
    });

    return NextResponse.json({ success: true, dataSource });
  } catch (error: any) {
    // Check if this is a "secret already exists" error from Infisical
    if (error?.message?.includes('Secret already exist')) {
      return NextResponse.json({ success: false, error: 'Sample database already exists' }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: 'Failed to create Sample database' }, { status: 500 });
  }
}
