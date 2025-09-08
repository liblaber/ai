import { NextRequest, NextResponse } from 'next/server';
import { requireUserAbility } from '~/auth/session';
import { PermissionAction, PermissionResource } from '@prisma/client';
import { inviteService } from '~/lib/services/inviteService';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('api.invites');

export async function DELETE(request: NextRequest, { params }: { params: { inviteId: string } }) {
  try {
    const { userAbility } = await requireUserAbility(request);

    if (!userAbility.can(PermissionAction.delete, PermissionResource.AdminApp)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { inviteId } = params;

    await inviteService.deleteInvite(inviteId);

    return NextResponse.json({
      success: true,
      message: 'Invite removed successfully',
    });
  } catch (error) {
    logger.error('Error deleting invite:', error);

    if (error instanceof Error && error.message === 'Invite not found') {
      return NextResponse.json({ success: false, error: 'Invite not found' }, { status: 404 });
    }

    return NextResponse.json({ success: false, error: 'Failed to remove invite' }, { status: 500 });
  }
}
