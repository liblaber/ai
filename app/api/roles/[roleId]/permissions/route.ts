import { NextRequest, NextResponse } from 'next/server';
import { createPermission, getRolePermissions } from '~/lib/services/permissionService';
import { getRole } from '~/lib/services/roleService';
import { requireUserAbility } from '~/auth/session';
import { PermissionAction, PermissionResource } from '@prisma/client';
import { invalidateUserAbilityCacheByRoleId } from '~/lib/casl/user-ability';

export async function GET(request: NextRequest, { params }: { params: Promise<{ roleId: string }> }) {
  const { userAbility } = await requireUserAbility(request);

  if (!userAbility.can(PermissionAction.read, PermissionResource.AdminApp)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { roleId } = await params;

  const permissions = await getRolePermissions(roleId);

  return NextResponse.json({ success: true, permissions });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ roleId: string }> }) {
  const { userAbility } = await requireUserAbility(request);

  if (!userAbility.can(PermissionAction.create, PermissionResource.AdminApp)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { roleId } = await params;

  const body = (await request.json()) as {
    action: PermissionAction;
    resource: PermissionResource;
    environmentId?: string;
    dataSourceId?: string;
    websiteId?: string;
  };

  const role = await getRole(roleId);

  if (!role) {
    return NextResponse.json({ success: false, error: 'Role not found' }, { status: 404 });
  }

  try {
    const permission = await createPermission(
      roleId,
      body.action,
      body.resource,
      body.environmentId,
      body.dataSourceId,
      body.websiteId,
    );
    invalidateUserAbilityCacheByRoleId(roleId);

    return NextResponse.json({ success: true, permission });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create permission' },
      { status: 400 },
    );
  }
}
