import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '~/utils/logger';
import { requireUserAbility } from '~/auth/session';
import { createWebsite, getWebsites } from '~/lib/services/websiteService';
import { PermissionAction, PermissionResource } from '@prisma/client';

export async function GET(request: NextRequest) {
  const { userAbility } = await requireUserAbility(request);

  if (userAbility.cannot(PermissionAction.read, PermissionResource.Website)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const websites = await getWebsites(userAbility);

  return NextResponse.json({ success: true, websites });
}

const postRequestSchema = z.object({
  chatId: z.string().min(1, 'Chat ID is required'),
  createdById: z.string().min(1, 'User ID is required'),
  siteId: z.string().optional().default(''),
  siteName: z.string().optional().default(''),
  siteUrl: z.string().optional().default(''),
});

export async function POST(request: NextRequest) {
  try {
    const { userAbility } = await requireUserAbility(request);

    const body = await request.json();
    const parsedBody = postRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ success: false, error: parsedBody.error.flatten().fieldErrors }, { status: 400 });
    }

    if (userAbility.cannot(PermissionAction.create, PermissionResource.Website)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const website = await createWebsite(parsedBody.data);

    logger.info(
      'Website created successfully',
      JSON.stringify({ chatId: parsedBody.data.chatId, websiteId: website.id }),
    );

    return NextResponse.json({ success: true, website });
  } catch (error) {
    logger.error('Failed to create website', error);
    return NextResponse.json({ success: false, error: 'Failed to create website' }, { status: 500 });
  }
}
