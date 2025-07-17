import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '~//lib/prisma';
import { logger } from '~//utils/logger';
import { requireUserId } from '~//auth/session';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(request);
  const { id: websiteId } = await params;

  if (!websiteId) {
    return NextResponse.json({ error: 'Website ID is required' }, { status: 400 });
  }

  try {
    const website = await prisma.website.findFirst({
      where: {
        id: websiteId,
        userId,
      },
    });

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    const updateData: any = {};

    const updatedWebsite = await prisma.website.update({
      where: {
        id: websiteId,
        userId,
      },
      data: updateData,
    });

    return NextResponse.json({ website: updatedWebsite });
  } catch (error) {
    logger.error(
      'Error updating website',
      JSON.stringify({
        websiteId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    );

    const errorMessage = error instanceof Error ? error.message : 'Failed to update website';

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
