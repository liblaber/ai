import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUserAbility } from '~/auth/session';
import { PermissionAction, PermissionResource } from '@prisma/client';
import { inviteService } from '~/lib/services/inviteService';
import { InviteStatus } from '@prisma/client';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('api.invites');

const createInviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  roleId: z.string().min(1, 'Role ID is required'),
});

export async function GET(request: NextRequest) {
  try {
    const { userAbility } = await requireUserAbility(request);

    if (!userAbility.can(PermissionAction.read, PermissionResource.AdminApp)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as InviteStatus;

    if (status && !Object.values(InviteStatus).includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
    }

    const invites = status
      ? await inviteService.getInvitesByStatus(status)
      : await inviteService.getInvitesByStatus(InviteStatus.PENDING);

    return NextResponse.json({ success: true, invites });
  } catch (error) {
    logger.error('Error fetching invites:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch invites' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userAbility, userId } = await requireUserAbility(request);

    if (!userAbility.can(PermissionAction.create, PermissionResource.AdminApp)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsedBody = createInviteSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ success: false, error: parsedBody.error.flatten().fieldErrors }, { status: 400 });
    }

    const { email, roleId } = parsedBody.data;

    const invite = await inviteService.createInvite(email, roleId, userId);

    return NextResponse.json({
      success: true,
      invite,
      message: 'Invitation sent successfully',
    });
  } catch (error) {
    logger.error('Error creating invite:', error);

    if (error instanceof Error) {
      if (error.message.includes('already exists') || error.message.includes('already a pending invite')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: false, error: 'Failed to create invite' }, { status: 500 });
  }
}
