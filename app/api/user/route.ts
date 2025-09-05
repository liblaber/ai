import { PermissionAction, PermissionResource } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { requireUserAbility } from '~/auth/session';
import { userService } from '~/lib/services/userService';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('user-api');
import { z } from 'zod';

const updateRoleSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  roleId: z.string().min(1, 'Role ID is required'),
});

export async function GET(request: NextRequest) {
  try {
    const { userAbility } = await requireUserAbility(request);

    if (!userAbility.can(PermissionAction.manage, PermissionResource.AdminApp)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const [usersWithRoles, usersWithoutRoles] = await Promise.all([
      userService.getAllUsersWithRoles(),
      userService.getAllUsersWithoutRoles(),
    ]);

    return NextResponse.json(
      {
        success: true,
        users: usersWithRoles,
        usersWithoutRoles,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error('Failed to fetch users:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userAbility } = await requireUserAbility(request);
    const body = await request.json();
    const parsedBody = updateRoleSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ success: false, error: parsedBody.error.flatten().fieldErrors }, { status: 400 });
    }

    if (!userAbility.can(PermissionAction.manage, PermissionResource.AdminApp)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { userId, roleId } = parsedBody.data;

    const targetUser = await userService.updateUserRoleToNewSystem(userId, roleId);

    return NextResponse.json({ success: true, user: targetUser });
  } catch (error) {
    logger.error('Failed to update user role:', error);
    return NextResponse.json({ success: false, error: 'Failed to update user role' }, { status: 500 });
  }
}
