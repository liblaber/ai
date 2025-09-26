import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '~/auth/session';
import { prisma } from '~/lib/prisma';
import { logger } from '~/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId(request);
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (slug) {
      // Check if slug is available
      const websites = await prisma.website.findMany({
        where: {
          slug,
        },
        select: {
          id: true,
          slug: true,
        },
      });

      return NextResponse.json({ websites });
    }

    // Get all websites for the user
    const websites = await prisma.website.findMany({
      where: {
        createdById: userId,
      },
      include: {
        environment: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      websites,
    });
  } catch (error) {
    logger.error('Error fetching websites', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Failed to fetch websites' }, { status: 500 });
  }
}
