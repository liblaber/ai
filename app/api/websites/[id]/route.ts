import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '~/auth/session';
import { prisma } from '~/lib/prisma';
import { logger } from '~/utils/logger';
import { generateUniqueSlug } from '~/utils/slug';
import { z } from 'zod';

const requestBodySchema = z.object({
  siteName: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(50).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId(request);
    const { id } = await params;
    const body = await request.json();
    const parseResult = requestBodySchema.parse(body);
    const { siteName, slug } = parseResult;

    // Verify the website belongs to the user
    const existingWebsite = await prisma.website.findFirst({
      where: {
        id,
        createdById: userId,
      },
    });

    if (!existingWebsite) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};

    if (siteName !== undefined) {
      updateData.siteName = siteName;
    }

    if (slug !== undefined) {
      if (slug && slug.trim()) {
        // Check if slug is already taken by another website
        const existingSlugWebsite = await prisma.website.findFirst({
          where: {
            slug: slug.trim(),
            id: { not: id }, // Exclude current website
          },
        });

        if (existingSlugWebsite) {
          return NextResponse.json({ error: 'Slug is already taken' }, { status: 400 });
        }

        updateData.slug = slug.trim();
      } else {
        // Generate a new slug if empty
        const baseSlug = siteName || existingWebsite.siteName || 'untitled-app';
        updateData.slug = await generateUniqueSlug(baseSlug, existingWebsite.slug || undefined);
      }
    }

    // Update the website
    const updatedWebsite = await prisma.website.update({
      where: { id },
      data: updateData,
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
    });

    return NextResponse.json({
      success: true,
      website: updatedWebsite,
    });
  } catch (error) {
    logger.error('Error updating website', {
      error: error instanceof Error ? error.message : String(error),
      websiteId: (await params).id,
    });
    return NextResponse.json({ error: 'Failed to update website' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId(request);
    const { id } = await params;

    // Verify the website belongs to the user
    const existingWebsite = await prisma.website.findFirst({
      where: {
        id,
        createdById: userId,
      },
    });

    if (!existingWebsite) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    // Delete the website
    await prisma.website.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting website', {
      error: error instanceof Error ? error.message : String(error),
      websiteId: (await params).id,
    });
    return NextResponse.json({ error: 'Failed to delete website' }, { status: 500 });
  }
}
