import { prisma } from '~/lib/prisma';
import { PermissionAction, PermissionResource, RoleScope } from '@prisma/client';
import type { Permission, Role } from '@prisma/client';
import type { ResourceRoleScope } from '~/lib/services/roleService';

export interface ResourceConfig {
  fetchResource: (id: string) => Promise<any>;
  permissionResource: 'DataSource' | 'Environment' | 'Website';
  roleScope: ResourceRoleScope;
  resourceLabel: string;
}

export function getResourceConfig(resourceType: string): ResourceConfig {
  switch (resourceType.toLowerCase()) {
    case 'data-sources':
      return {
        fetchResource: (id: string) => prisma.dataSource.findUniqueOrThrow({ where: { id } }),
        permissionResource: PermissionResource.DataSource,
        roleScope: RoleScope.DATA_SOURCE,
        resourceLabel: 'Data source',
      };
    case 'environments':
      return {
        fetchResource: (id: string) => prisma.environment.findUniqueOrThrow({ where: { id } }),
        permissionResource: PermissionResource.Environment,
        roleScope: RoleScope.ENVIRONMENT,
        resourceLabel: 'Environment',
      };
    case 'websites':
      return {
        fetchResource: (id: string) => prisma.website.findUniqueOrThrow({ where: { id } }),
        permissionResource: PermissionResource.Website,
        roleScope: RoleScope.WEBSITE,
        resourceLabel: 'Website',
      };
    default:
      throw new Error(`Invalid resource type provided: "${resourceType}"`);
  }
}

export interface ResourceMember {
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

export type RoleType = 'general' | 'manage' | 'viewer';

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

export async function getMembersForResource(
  resourceId: string,
  roleScope: RoleScope,
  permissionResource: PermissionResource,
): Promise<ResourceMember[]> {
  const resourceIdField = `${permissionResource.charAt(0).toLowerCase() + permissionResource.slice(1)}Id`;

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
