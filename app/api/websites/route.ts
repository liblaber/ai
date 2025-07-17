import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '~/lib/prisma';
import { logger } from '~/utils/logger';
import '~/lib/config/env';
import { requireUserId } from '~/auth/session';

export async function GET(request: NextRequest) {
  const userId = await requireUserId(request);

  const websites = await prisma.website.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return NextResponse.json({ websites });
}

interface CreateWebsiteRequest {
  chatId: string;
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId(request);

  try {
    const { chatId } = (await request.json()) as CreateWebsiteRequest;

    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
    }

    // Create a new website with empty strings for nullable fields
    const website = await prisma.website.create({
      data: {
        chatId,
        userId,
        siteId: '',
        siteName: '',
        siteUrl: '',
      },
    });

    logger.info('Website created successfully', JSON.stringify({ chatId, websiteId: website.id }));

    return NextResponse.json({ website });
  } catch (error) {
    logger.error(
      'Failed to create website',
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    );

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create website',
      },
      { status: 500 },
    );
  }
}
