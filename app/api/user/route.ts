import { PermissionAction, PermissionResource } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { requireUserAbility } from '~/auth/session';
import { userService } from '~/lib/services/userService';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('user-api');

type UpdateRoleBody = {
  userId: string;
  role: 'ADMIN' | 'MEMBER';
};

export async function GET(request: NextRequest) {
  try {
    const { userAbility } = await requireUserAbility(request);

    if (!userAbility.can(PermissionAction.manage, PermissionResource.AdminApp)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const users = await userService.getAllUsers();

    return NextResponse.json({ success: true, users }, { status: 200 });
  } catch (error) {
    logger.error('Failed to fetch users:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userAbility } = await requireUserAbility(request);
    const body = (await request.json()) as UpdateRoleBody;

    if (!userAbility.can(PermissionAction.manage, PermissionResource.AdminApp)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const targetUser = await userService.updateUserRole(body.userId, body.role);

    return NextResponse.json({ success: true, user: targetUser });
  } catch (error) {
    logger.error('Failed to update user role:', error);
    return NextResponse.json({ success: false, error: 'Failed to update user role' }, { status: 500 });
  }
}
