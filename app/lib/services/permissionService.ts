import { prisma } from '@/lib/prisma';
import { PermissionAction, PermissionResource } from '@prisma/client';
import type { Permission } from '@prisma/client';

export const PERMISSION_LEVELS = ['viewer', 'manage'] as const;

export type PermissionLevel = (typeof PERMISSION_LEVELS)[number];
export interface PermissionDetails {
  label: string;
  action: PermissionAction;
}

export const permissionLevels: Record<PermissionLevel, PermissionDetails> = {
  viewer: {
    label: 'VIEWER',
    action: PermissionAction.read,
  },
  manage: {
    label: 'MANAGE',
    action: PermissionAction.manage,
  },
} as const;

export function getPermissionLevelDetails(level: PermissionLevel): PermissionDetails {
  return permissionLevels[level];
}

export async function getUserPermissions(userId: string): Promise<Permission[]> {
  const userWithRoles = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: true,
            },
          },
        },
      },
    },
  });

  if (!userWithRoles) {
    return [];
  }

  // Flatten all permissions from all user roles
  const permissions = userWithRoles.roles.flatMap((userRole) => userRole.role.permissions);

  return permissions;
}

export async function getRolePermissions(roleId: string): Promise<Permission[]> {
  return prisma.permission.findMany({
    where: { roleId },
  });
}

export async function getPermission(id: string): Promise<Permission | null> {
  return prisma.permission.findUnique({
    where: { id },
  });
}

export async function createPermission(
  roleId: string,
  action: PermissionAction,
  resource: PermissionResource,
  environmentId?: string,
  dataSourceId?: string,
  websiteId?: string,
): Promise<Permission> {
  return prisma.permission.create({
    data: {
      roleId,
      action,
      resource,
      environmentId,
      dataSourceId,
      websiteId,
    },
  });
}

export async function deletePermission(id: string): Promise<Permission> {
  return prisma.permission.delete({
    where: { id },
  });
}
