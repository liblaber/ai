import { NextRequest, NextResponse } from 'next/server';
import { userService } from '~/lib/services/userService';
import { requireUserAbility } from '~/auth/session';
import { PermissionAction, PermissionResource, Prisma } from '@prisma/client';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string; userId: string }> },
) {
  const { userAbility } = await requireUserAbility(request);

  if (!userAbility.can(PermissionAction.delete, PermissionResource.AdminApp)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { roleId, userId } = await params;

  try {
    await userService.removeUserFromRole(userId, roleId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ success: false, error: 'User not found in this role' }, { status: 404 });
      }
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to remove user from role' },
      { status: 400 },
    );
  }
}
