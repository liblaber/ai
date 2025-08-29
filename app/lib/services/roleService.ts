import { prisma } from '~/lib/prisma';
import { RoleScope, Prisma, PrismaClient } from '@prisma/client';
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
  prismaClient: Prisma.TransactionClient | PrismaClient = prisma, // Optional to allow transaction
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

  return prismaClient.role.create({
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

export async function addUserToResourceRole(
  userId: string,
  resourceId: string,
  roleScope: ResourceRoleScope,
  permissionLevel: PermissionLevel,
  prismaClient: Prisma.TransactionClient | PrismaClient = prisma, // Optional to allow transaction
): Promise<void> {
  const role = await findOrCreateResourceRole(roleScope, resourceId, permissionLevel, prismaClient);

  if (!role) {
    throw new Error('Role not found and could not be created');
  }

  await prismaClient.userRole.create({
    data: {
      userId,
      roleId: role.id,
    },
  });
}

export async function removeUserFromResourceRole(
  userId: string,
  resourceId: string,
  roleScope: ResourceRoleScope,
  prismaClient: Prisma.TransactionClient | PrismaClient = prisma, // Optional to allow transaction
): Promise<void> {
  const role = await getResourceRoleByUser(roleScope, resourceId, userId);

  if (!role) {
    throw new Error('Member does not have an association with this resource');
  }

  await prismaClient.userRole.delete({
    where: {
      userId_roleId: {
        userId,
        roleId: role.id,
      },
    },
  });
}

export async function updateUserRoleForResource(
  userId: string,
  resourceId: string,
  roleScope: ResourceRoleScope,
  newPermissionLevel: PermissionLevel,
): Promise<void> {
  return prisma.$transaction(async (tx) => {
    await removeUserFromResourceRole(userId, resourceId, roleScope, tx);
    await addUserToResourceRole(userId, resourceId, roleScope, newPermissionLevel, tx);
  });
}
