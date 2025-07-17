import { prisma } from '~//lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '~//auth/session';

export async function POST(request: NextRequest) {
  const userId = await requireUserId(request);

  try {
    const existingSampleDatabase = await prisma.dataSource.findFirst({
      where: {
        userId,
        name: 'Sample Database',
      },
    });

    if (existingSampleDatabase) {
      return NextResponse.json({ success: false, error: 'Sample database already exists' }, { status: 400 });
    }

    const dataSource = await prisma.dataSource.create({
      data: {
        userId,
        name: 'Sample Database',
        connectionString: 'sqlite://example.db',
      },
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
