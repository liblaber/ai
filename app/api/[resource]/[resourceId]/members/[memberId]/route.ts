import { NextRequest, NextResponse } from 'next/server';
import { subject } from '@casl/ability';
import { PermissionAction, Prisma } from '@prisma/client';
import { z } from 'zod';
import { requireUserAbility } from '~/auth/session';
import { removeUserFromResourceRole, updateUserRoleForResource } from '~/lib/services/roleService';
import { userService } from '~/lib/services/userService';
import { PERMISSION_LEVELS } from '~/lib/services/permissionService';
import { invalidateUserAbilityCache } from '~/lib/casl/user-ability';
import { getResourceConfig } from '~/lib/utils/resource-utils';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string; resourceId: string; memberId: string }> },
) {
  try {
    const { userAbility } = await requireUserAbility(request);
    const { resource, resourceId, memberId } = await params;
    const { fetchResource, permissionResource, roleScope } = getResourceConfig(resource);

    const resourceData = await fetchResource(resourceId);

    if (userAbility.cannot(PermissionAction.manage, subject(permissionResource, resourceData))) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await removeUserFromResourceRole(memberId, resourceId, roleScope);

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
      { status: 500 },
    );
  }
}

const patchRequestSchema = z.object({
  permissionLevel: z.enum(PERMISSION_LEVELS),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string; resourceId: string; memberId: string }> },
) {
  try {
    const { userAbility, userId } = await requireUserAbility(request);
    const { resource, resourceId, memberId } = await params;

    if (userId === memberId) {
      return NextResponse.json({ success: false, error: 'You cannot change your own role' }, { status: 403 });
    }

    const body = await request.json();
    const parsedBody = patchRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ success: false, error: parsedBody.error.flatten().fieldErrors }, { status: 400 });
    }

    const { permissionLevel: newPermissionLevel } = parsedBody.data;

    const { fetchResource, permissionResource, roleScope } = getResourceConfig(resource);

    const resourceData = await fetchResource(resourceId);

    if (!resource) {
      return NextResponse.json({ success: false, error: 'Resource not found' }, { status: 404 });
    }

    if (userAbility.cannot(PermissionAction.manage, subject(permissionResource, resourceData))) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const user = await userService.getUser(memberId);

    await updateUserRoleForResource(memberId, resourceId, roleScope, newPermissionLevel, user.organizationId!);

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
      { success: false, error: error instanceof Error ? error.message : 'Failed to update user role' },
      { status: 500 },
    );
  }
}
