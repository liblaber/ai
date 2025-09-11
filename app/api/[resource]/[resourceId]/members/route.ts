import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { userService } from '~/lib/services/userService';
import { PERMISSION_LEVELS } from '~/lib/services/permissionService';
import { addUserToResourceRole } from '~/lib/services/roleService';
import { getResourceConfig, getMembersForResource } from '~/lib/utils/resource-utils';
import { requireUserAbility } from '~/auth/session';
import { PermissionAction, Prisma } from '@prisma/client';
import { subject } from '@casl/ability';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string; resourceId: string }> },
) {
  try {
    const { userAbility } = await requireUserAbility(request);
    const { resource, resourceId } = await params;
    const resourceConfig = getResourceConfig(resource);

    const { fetchResource, permissionResource, roleScope } = resourceConfig;

    const resourceData = await fetchResource(resourceId);

    if (userAbility.cannot(PermissionAction.read, subject(permissionResource, resourceData))) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const members = await getMembersForResource(resourceId, roleScope, permissionResource);

    return NextResponse.json({ success: true, members });
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

    return NextResponse.json({ success: false, error: 'Failed to retrieve members' }, { status: 500 });
  }
}

const postRequestSchema = z.object({
  userId: z.string(),
  permissionLevel: z.enum(PERMISSION_LEVELS),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string; resourceId: string }> },
) {
  try {
    const { userAbility } = await requireUserAbility(request);
    const { resource, resourceId } = await params;
    const body = await request.json();
    const parsedBody = postRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ success: false, error: parsedBody.error.flatten().fieldErrors }, { status: 400 });
    }

    const { userId, permissionLevel } = parsedBody.data;
    const resourceConfig = getResourceConfig(resource);
    const { fetchResource, permissionResource, roleScope } = resourceConfig;

    const resourceData = await fetchResource(resourceId);

    if (userAbility.cannot(PermissionAction.manage, subject(permissionResource, resourceData))) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const user = await userService.getUser(userId);

    await addUserToResourceRole(user.id, resourceId, roleScope, permissionLevel);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid resource type')) {
      return NextResponse.json({ success: false, error: 'Invalid route' }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({ success: false, error: 'User is already associated to the role' }, { status: 400 });
      }

      if (error.code === 'P2025') {
        return NextResponse.json(
          { success: false, error: `${error.meta?.modelName || 'Resource'} not found` },
          { status: 404 },
        );
      }
    }

    return NextResponse.json({ success: false, error: 'Failed to assign user to role' }, { status: 500 });
  }
}
