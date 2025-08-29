import { prisma } from '~/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '~/auth/session';
import { createSampleDataSource } from '~/lib/services/dataSourceService';

export async function POST(request: NextRequest) {
  const userId = await requireUserId(request);

  try {
    const body = await request.json();
    const { environmentId } = body as { environmentId: string };

    if (!environmentId) {
      return NextResponse.json({ success: false, error: 'Environment ID is required' }, { status: 400 });
    }

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
      console.error('Sample database already exists', error);
      return NextResponse.json({ success: false, error: 'Sample database already exists' }, { status: 400 });
    }

    console.error('Error creating Sample database:', error);

    return NextResponse.json({ success: false, error: 'Failed to create Sample database' }, { status: 500 });
  }
}
