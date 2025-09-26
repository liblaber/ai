import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '~/auth/session';
import { generateDefaultSlug, generateUniqueSlug, isValidSlug } from '~/utils/slug';
import { prisma } from '~/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    await requireUserId(request);

    const { baseSlug, chatId, siteName, existingSlug } = await request.json<any>(); // TODO: type

    // Validate input
    if (!baseSlug && !chatId) {
      return NextResponse.json({ error: 'Either baseSlug or chatId is required' }, { status: 400 });
    }

    // Generate base slug if not provided
    const slugToUse = baseSlug || generateDefaultSlug(chatId, siteName);

    // Validate the base slug
    if (!isValidSlug(slugToUse)) {
      return NextResponse.json({ error: 'Invalid slug format' }, { status: 400 });
    }

    // Generate unique slug
    const uniqueSlug = await generateUniqueSlug(slugToUse, existingSlug);

    return NextResponse.json({ slug: uniqueSlug });
  } catch (error) {
    console.error('Error generating slug:', error);
    return NextResponse.json({ error: 'Failed to generate slug' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ error: 'Slug parameter is required' }, { status: 400 });
    }

    // Validate slug format
    const isValid = isValidSlug(slug);

    if (!isValid) {
      return NextResponse.json({ isValid: false, isAvailable: false });
    }

    // Check if slug is available (not used by other websites)
    const existingWebsite = await prisma.website.findFirst({
      where: {
        slug,
      },
      select: {
        id: true,
      },
    });

    const isAvailable = !existingWebsite;

    return NextResponse.json({
      isValid: true,
      isAvailable,
      message: isAvailable ? 'Slug is available' : 'Slug is already taken',
    });
  } catch (error) {
    console.error('Error validating slug:', error);
    return NextResponse.json({ error: 'Failed to validate slug' }, { status: 500 });
  }
}
