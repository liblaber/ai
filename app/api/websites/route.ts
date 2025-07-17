import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '~/lib/prisma';
import { logger } from '~/utils/logger';
import '~/lib/config/env';
import { requireUserId } from '~/auth/session';

// Netlify API client
const NETLIFY_API_URL = 'https://api.netlify.com/api/v1';
const NETLIFY_ACCESS_TOKEN = process.env.NETLIFY_AUTH_TOKEN;

async function deleteNetlifySite(siteId: string) {
  if (!NETLIFY_ACCESS_TOKEN) {
    throw new Error('NETLIFY_ACCESS_TOKEN is not configured');
  }

  const response = await fetch(`${NETLIFY_API_URL}/sites/${siteId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${NETLIFY_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = (await response.json()) as any;
    throw new Error(`Failed to delete Netlify site: ${error.message || response.statusText}`);
  }

  return true;
}

export async function GET(request: NextRequest) {
  const userId = await requireUserId(request);
  const url = new URL(request.url);
  const siteUrl = url.searchParams.get('url');
  const chatId = url.searchParams.get('chatId');

  if (chatId) {
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
  }

  if (siteUrl) {
    const website = await prisma.website.findFirst({
      where: {
        siteUrl,
        userId,
      },
    });

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    return NextResponse.json({ website });
  }

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

export async function DELETE(request: NextRequest) {
  const userId = await requireUserId(request);
  const url = new URL(request.url);
  const websiteId = url.searchParams.get('websiteId');

  if (!websiteId) {
    return NextResponse.json({ error: 'Website ID is required' }, { status: 400 });
  }

  // First get the website details to get the Netlify siteId
  const website = await prisma.website.findFirst({
    where: {
      id: websiteId,
      userId,
    },
  });

  if (!website) {
    return NextResponse.json({ error: 'Website not found' }, { status: 404 });
  }

  try {
    // Delete from Netlify first
    if (website.siteId) {
      await deleteNetlifySite(website.siteId);
    }

    // Then delete from our database
    await prisma.website.delete({
      where: {
        id: websiteId,
        userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting website:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to delete website';

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
