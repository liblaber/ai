import { NextRequest, NextResponse } from 'next/server';
import { userService } from '~/lib/services/userService';
import { requireUserAbility } from '~/auth/session';
import { PermissionAction, PermissionResource, Prisma } from '@prisma/client';

export async function GET(request: NextRequest, { params }: { params: Promise<{ roleId: string }> }) {
  const { userAbility } = await requireUserAbility(request);

  if (!userAbility.can(PermissionAction.read, PermissionResource.AdminApp)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { roleId } = await params;

  const users = await userService.getUsersByRole(roleId);

  return NextResponse.json({ success: true, users });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ roleId: string }> }) {
  const { userAbility } = await requireUserAbility(request);

  if (!userAbility.can(PermissionAction.create, PermissionResource.AdminApp)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { roleId } = await params;

  const body = (await request.json()) as {
    userId: string;
  };

  try {
    const user = await userService.addUserToRole(body.userId, roleId);
    return NextResponse.json({ success: true, user });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({ success: false, error: 'User already exists in this role' }, { status: 400 });
      }

      if (error.code === 'P2003') {
        return NextResponse.json({ success: false, error: 'Invalid role or user ID' }, { status: 404 });
      }
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to add user to role' },
      { status: 400 },
    );
  }
}
