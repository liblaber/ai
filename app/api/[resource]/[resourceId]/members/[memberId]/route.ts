import { NextRequest, NextResponse } from 'next/server';
import { userService } from '~/lib/services/userService';
import { getResourceRoleByUser } from '~/lib/services/roleService';
import { requireUserAbility } from '~/auth/session';
import { PermissionAction, Prisma } from '@prisma/client';
import { invalidateUserAbilityCache } from '~/lib/casl/user-ability';
import { subject } from '@casl/ability';
import { getResourceConfig } from '~/lib/utils/resource-utils';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string; resourceId: string; memberId: string }> },
) {
  try {
    const { userAbility } = await requireUserAbility(request);
    const { resource, resourceId, memberId } = await params;
    const { fetchResource, permissionResource, roleScope } = getResourceConfig(resource);

    const role = await getResourceRoleByUser(roleScope, resourceId, memberId);

    if (!role) {
      return NextResponse.json(
        { success: false, error: 'Member does not have an association with this resource' },
        { status: 404 },
      );
    }

    if (!role.resourceId) {
      return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
    }

    const resourceData = await fetchResource(role.resourceId);

    if (userAbility.cannot(PermissionAction.manage, subject(permissionResource, resourceData))) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await userService.removeUserFromRole(memberId, role.id);
    invalidateUserAbilityCache(memberId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid resource type')) {
      return NextResponse.json({ success: false, error: 'Invalid route' }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: `${error.meta?.modelName || 'Resource'} not found` },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to remove user from role' },
      { status: 400 },
    );
  }
}
