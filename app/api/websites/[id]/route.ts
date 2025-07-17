import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '~/lib/prisma';
import { logger } from '~/utils/logger';
import { requireUserId } from '~/auth/session';
import '~/lib/config/env';

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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    return NextResponse.json({ website });
  } catch (error) {
    logger.error(
      'Error fetching website',
      JSON.stringify({
        websiteId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    );

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch website';

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(request);
  const { id: websiteId } = await params;

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
