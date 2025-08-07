import { NextRequest, NextResponse } from 'next/server';
import { deletePermission, getPermission } from '~/lib/services/permissionService';
import { requireUserAbility } from '~/auth/session';
import { PermissionAction, PermissionResource, Prisma } from '@prisma/client';

export async function GET(request: NextRequest, { params }: { params: Promise<{ permissionId: string }> }) {
  const { userAbility } = await requireUserAbility(request);

  if (!userAbility.can(PermissionAction.read, PermissionResource.AdminApp)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { permissionId } = await params;

  const permission = await getPermission(permissionId);

  if (!permission) {
    return NextResponse.json({ success: false, error: 'Permission not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, permission });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ permissionId: string }> }) {
  const { userAbility } = await requireUserAbility(request);

  if (!userAbility.can(PermissionAction.delete, PermissionResource.AdminApp)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { permissionId } = await params;

  try {
    await deletePermission(permissionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ success: false, error: 'Permission not found' }, { status: 404 });
      }
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete permission' },
      { status: 400 },
    );
  }
}
