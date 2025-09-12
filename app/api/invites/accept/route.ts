import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUserAbility } from '~/auth/session';
import { inviteService } from '~/lib/services/inviteService';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('api.invites');

const acceptInviteSchema = z.object({
  inviteId: z.string().min(1, 'Invite ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireUserAbility(request);

    const body = await request.json();
    const parsedBody = acceptInviteSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ success: false, error: parsedBody.error.flatten().fieldErrors }, { status: 400 });
    }

    const { inviteId } = parsedBody.data;

    await inviteService.acceptInvite(inviteId, userId);

    return NextResponse.json({
      success: true,
      message: 'Invite accepted successfully',
    });
  } catch (error) {
    logger.error('Error accepting invite:', error);

    if (error instanceof Error) {
      if (
        error.message.includes('not found') ||
        error.message.includes('no longer valid') ||
        error.message.includes('expired') ||
        error.message.includes('does not match')
      ) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: false, error: 'Failed to accept invite' }, { status: 500 });
  }
}
