import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { userService } from '~/lib/services/userService';
import { PERMISSION_LEVELS } from '~/lib/services/permissionService';
import { addUserToResourceRole } from '~/lib/services/roleService';
import { getResourceConfig } from '~/lib/utils/resource-utils';
import { requireUserAbility } from '~/auth/session';
import { PermissionAction, PermissionResource, Prisma, RoleScope } from '@prisma/client';
import type { Permission, Role } from '@prisma/client';
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
  email: z.string(),
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

    const { email, permissionLevel } = parsedBody.data;
    const resourceConfig = getResourceConfig(resource);
    const { fetchResource, permissionResource, roleScope } = resourceConfig;

    const resourceData = await fetchResource(resourceId);

    if (userAbility.cannot(PermissionAction.manage, subject(permissionResource, resourceData))) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const user = await userService.getUserByEmail(email);

    // TODO: use invite system if user does not exist

    await addUserToResourceRole(user.id, resourceId, roleScope, permissionLevel, user.organizationId!);

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

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to assign user to role' },
      { status: 500 },
    );
  }
}

interface ResourceMember {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: {
    id: string;
    name: string;
    type: RoleType;
  };
}

type RoleType = 'general' | 'manage' | 'viewer';

const roleTypeWeights: Record<RoleType, number> = {
  general: 3,
  manage: 2,
  viewer: 1,
};

export function getHighestRoleType(role: Role, permissions: Pick<Permission, 'action'>[]): RoleType {
  // This is a role that is not scoped to a specific resource
  if (role.scope === RoleScope.GENERAL) {
    return 'general';
  }

  const actions = new Set(permissions.map((p) => p.action));

  if (actions.has(PermissionAction.manage)) {
    return 'manage';
  }

  return 'viewer';
}

async function getMembersForResource(
  resourceId: string,
  roleScope: RoleScope,
  permissionResource: PermissionResource,
): Promise<ResourceMember[]> {
  const resourceIdField = `${permissionResource.toLowerCase()}Id`;

  // Find all UserRole entries that link to a role with the required permissions.
  const userRoles = await prisma.userRole.findMany({
    where: {
      role: {
        scope: { in: [roleScope, RoleScope.GENERAL] },
        permissions: {
          some: {
            // The permission action must be 'manage' or 'read'.
            action: { in: [PermissionAction.manage, PermissionAction.read] },
            // The permission must be for this specific resource type OR for 'all' resources.
            resource: { in: [permissionResource, PermissionResource.all] },
            // The permission must be linked to this specific resource ID OR be a general permission
            OR: [{ [resourceIdField]: resourceId }, { [resourceIdField]: null }],
          },
        },
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      role: {
        include: {
          permissions: true,
        },
      },
    },
  });

  // A user might have multiple roles that grant access. We want to return each user only once with their highest level role.
  const memberMap = new Map<string, ResourceMember>();

  for (const { user, role } of userRoles) {
    if (user) {
      const currentRoleType = getHighestRoleType(role, role.permissions);
      const existingMember = memberMap.get(user.id);

      if (!existingMember || roleTypeWeights[currentRoleType] > roleTypeWeights[existingMember.role.type]) {
        memberMap.set(user.id, {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: {
            id: role.id,
            name: role.name,
            type: currentRoleType,
          },
        });
      }
    }
  }

  return Array.from(memberMap.values());
}
