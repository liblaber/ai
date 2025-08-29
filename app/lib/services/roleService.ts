import { prisma } from '~/lib/prisma';
import { RoleScope } from '@prisma/client';
import { type Role, PermissionAction, PermissionResource } from '@prisma/client';
import { permissionLevels, type PermissionLevel } from '~/lib/services/permissionService';

export type ResourceRoleScope = Exclude<RoleScope, 'GENERAL'>;

export const roleScopeResourceMap: Record<ResourceRoleScope, PermissionResource> = {
  [RoleScope.DATA_SOURCE]: PermissionResource.DataSource,
  [RoleScope.ENVIRONMENT]: PermissionResource.Environment,
  [RoleScope.WEBSITE]: PermissionResource.Website,
};

export async function getRole(id: string): Promise<Role | null> {
  return prisma.role.findUnique({
    where: { id },
    include: {
      permissions: true,
    },
  });
}

export async function getRoles(): Promise<Role[]> {
  const roles = await prisma.role.findMany({
    include: {
      permissions: true,
      users: {
        include: {
          user: true,
        },
      },
    },
  });

  return roles.map((role) => ({
    ...role,
    users: role.users.map((user) => ({
      id: user.user.id,
      name: user.user.name,
      email: user.user.email,
    })),
  }));
}

export async function getResourceRoleByUser(
  scope: ResourceRoleScope,
  resourceId: string,
  userId: string,
): Promise<Role | null> {
  return await prisma.role.findFirst({
    where: {
      scope,
      resourceId,
      users: {
        some: {
          userId,
        },
      },
    },
  });
}

export async function findOrCreateResourceRole(
  scope: ResourceRoleScope,
  resourceId: string,
  permissionLevel: PermissionLevel,
): Promise<Role | null> {
  const permissionDetails = permissionLevels[permissionLevel];

  const name = `${scope}_${permissionDetails.label}_${resourceId}`;

  const existingRole = await prisma.role.findFirst({
    where: { scope, resourceId, name },
  });

  if (existingRole) {
    return existingRole;
  }

  const permissionData: {
    action: PermissionAction;
    resource: PermissionResource;
    dataSourceId?: string;
    environmentId?: string;
    websiteId?: string;
  } = {
    action: permissionDetails.action,
    resource: roleScopeResourceMap[scope],
  };

  switch (scope) {
    case RoleScope.DATA_SOURCE:
      permissionData.dataSourceId = resourceId;
      break;
    case RoleScope.ENVIRONMENT:
      permissionData.environmentId = resourceId;
      break;
    case RoleScope.WEBSITE:
      permissionData.websiteId = resourceId;
      break;
  }

  return prisma.role.create({
    data: {
      name,
      description: `Grants ${permissionLevel} access to ${scope} ${resourceId}`,
      scope,
      resourceId,
      permissions: {
        create: permissionData,
      },
    },
  });
}

export async function createRole(
  name: string,
  description: string | undefined = undefined,
  scope: RoleScope = RoleScope.GENERAL,
  resourceId?: string,
): Promise<Role> {
  return prisma.role.create({
    data: {
      name,
      description: description || null,
      scope,
      resourceId,
    },
  });
}

export async function updateRole(id: string, name: string, description?: string): Promise<Role> {
  return prisma.role.update({
    where: { id },
    data: {
      name,
      description: description || null,
    },
  });
}

export async function deleteRole(id: string) {
  return prisma.role.delete({ where: { id } });
}
