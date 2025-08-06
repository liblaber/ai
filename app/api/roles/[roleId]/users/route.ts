import { NextRequest, NextResponse } from 'next/server';
import { userService } from '~/lib/services/userService';
import { requireUserAbility } from '~/auth/session';
import { PermissionAction, PermissionResource } from '@prisma/client';

export async function GET(request: NextRequest, { params }: { params: Promise<{ roleId: string }> }) {
  const { userAbility } = await requireUserAbility(request);

  if (!userAbility.can(PermissionAction.read, PermissionResource.AdminApp)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { roleId } = await params;

  const users = await userService.getUsersByRole(roleId);

  return NextResponse.json({ success: true, users });
}
