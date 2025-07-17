import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '~/lib/prisma';
import { logger } from '~/utils/logger';
import { requireUserId } from '~/auth/session';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(request);
  const { id: chatId } = await params;

  if (!chatId) {
    return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
  }

  try {
    const website = await prisma.website.findFirst({
      where: {
        chatId,
        userId,
      },
    });

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    return NextResponse.json({ website });
  } catch (error) {
    logger.error(
      'Error fetching website by chat ID',
      JSON.stringify({
        chatId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    );

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch website';

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
