import { NextRequest, NextResponse } from 'next/server';
import { deleteRole, getRole, updateRole } from '~/lib/services/roleService';
import { requireUserAbility } from '~/auth/session';
import { PermissionAction, PermissionResource, Prisma } from '@prisma/client';

export async function GET(request: NextRequest, { params }: { params: { roleId: string } }) {
  const { userAbility } = await requireUserAbility(request);

  if (!userAbility.can(PermissionAction.read, PermissionResource.AdminApp)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { roleId } = params;

  const role = await getRole(roleId);

  if (!role) {
    return NextResponse.json({ success: false, error: 'Role not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, role });
}

export async function PUT(request: NextRequest, { params }: { params: { roleId: string } }) {
  const { userAbility } = await requireUserAbility(request);

  if (!userAbility.can(PermissionAction.update, PermissionResource.AdminApp)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { roleId } = params;

  const body = (await request.json()) as {
    name: string;
    description?: string;
  };

  try {
    const updatedRole = await updateRole(roleId, body.name, body.description);

    return NextResponse.json({ success: true, role: updatedRole });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({ success: false, error: 'Role with this name already exists' }, { status: 400 });
      }

      if (error.code === 'P2025') {
        return NextResponse.json({ success: false, error: 'Role not found' }, { status: 404 });
      }
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update role' },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { roleId: string } }) {
  const { userAbility } = await requireUserAbility(request);

  if (!userAbility.can(PermissionAction.delete, PermissionResource.AdminApp)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { roleId } = params;

  try {
    await deleteRole(roleId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ success: false, error: 'Role not found' }, { status: 404 });
      }
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete role' },
      { status: 400 },
    );
  }
}
