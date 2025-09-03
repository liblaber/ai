import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PermissionAction, PermissionResource, Prisma } from '@prisma/client';
import { subject } from '@casl/ability';
import { requireUserAbility } from '~/auth/session';
import { deleteWebsite, getWebsite, updateWebsite } from '~/lib/services/websiteService';
import { env } from '~/env';

// Netlify API client
const NETLIFY_API_URL = 'https://api.netlify.com/api/v1';
const NETLIFY_ACCESS_TOKEN = env.server.NETLIFY_AUTH_TOKEN;

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
  try {
    const { userAbility } = await requireUserAbility(request);

    const { id } = await params;

    const website = await getWebsite(id);

    if (userAbility.cannot(PermissionAction.read, subject(PermissionResource.Website, website!))) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ success: true, website });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
    }

    return NextResponse.json({ success: false, error: 'Failed to fetch website' }, { status: 500 });
  }
}

const patchRequestSchema = z.object({
  siteName: z.string().min(1, 'Site name is required'),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userAbility } = await requireUserAbility(request);
    const { id } = await params;

    const body = await request.json();
    const parsedBody = patchRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ success: false, error: parsedBody.error.flatten().fieldErrors }, { status: 400 });
    }

    const website = await getWebsite(id);

    if (userAbility.cannot(PermissionAction.update, subject(PermissionResource.Website, website!))) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const updatedWebsite = await updateWebsite(id, parsedBody.data);

    return NextResponse.json({ success: true, website: updatedWebsite });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ success: false, error: `Website not found` }, { status: 404 });
    }

    return NextResponse.json({ success: false, error: 'Failed to update website' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userAbility } = await requireUserAbility(request);
    const { id } = await params;

    const website = await getWebsite(id);

    if (userAbility.cannot(PermissionAction.delete, subject(PermissionResource.Website, website!))) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Delete from Netlify first
    if (website?.siteId) {
      await deleteNetlifySite(website.siteId);
    }

    await deleteWebsite(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ success: false, error: `Website not found` }, { status: 404 });
    }

    return NextResponse.json({ success: false, error: 'Failed to delete website' }, { status: 500 });
  }
}
