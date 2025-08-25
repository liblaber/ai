import { prisma } from '~/lib/prisma';
import { PureAbility, AbilityBuilder } from '@casl/ability';
import { createPrismaAbility } from '@casl/prisma';
import { PermissionResource, PermissionAction } from '@prisma/client';
import type { PrismaQuery, Subjects } from '@casl/prisma';
import type { DataSource, Environment, Permission, Website } from '@prisma/client';
import type { PrismaResources } from './prisma-helpers';
import { getUserPermissions } from '~/lib/services/permissionService';
import { logger } from '~/utils/logger';

const ABILITY_CACHE: Record<string, AppAbility> = {};

type PrismaSubjects = Subjects<{
  Environment: Environment;
  DataSource: DataSource;
  Website: Website;
}>;

type NonPrismaSubjects = Exclude<PermissionResource, PrismaResources>;
type AppSubjects = PrismaSubjects | NonPrismaSubjects;

export type AppAbility = PureAbility<[PermissionAction, AppSubjects], PrismaQuery>;

export function createAbilityForUser(permissions: Permission[]): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createPrismaAbility);

  permissions.forEach((permission) => {
    const { action, resource, environmentId, dataSourceId, websiteId } = permission as Permission;

    // Handle different permission scenarios
    switch (resource) {
      case PermissionResource.all:
      case PermissionResource.BuilderApp:
      case PermissionResource.AdminApp:
        can(action, resource);
        break;

      case PermissionResource.Environment:
        if (environmentId) {
          can(action, PermissionResource.Environment, { id: environmentId });
        } else {
          can(action, PermissionResource.Environment);
        }

        break;

      case PermissionResource.DataSource:
        if (dataSourceId) {
          can(action, PermissionResource.DataSource, { id: dataSourceId });
        } else {
          can(action, PermissionResource.DataSource);
        }

        break;

      case PermissionResource.Website:
        if (websiteId) {
          can(action, PermissionResource.Website, { id: websiteId });
        } else {
          can(action, PermissionResource.Website);
        }

        break;

      // Add other resource types as needed...
      default:
        logger.warn(`User ability: Unknown resource type '${resource}' for action '${action}'`);
        break;
    }
  });

  return build();
}

export async function getUserAbility(userId: string): Promise<AppAbility> {
  if (ABILITY_CACHE[userId]) {
    return ABILITY_CACHE[userId];
  }

  const permissions = await getUserPermissions(userId);

  const userAbility = createAbilityForUser(permissions);

  ABILITY_CACHE[userId] = userAbility;

  return userAbility;
}

export function invalidateUserAbilityCache(userId: string): void {
  logger.debug(`Invalidating user ability cache for user ID: ${userId}`);
  delete ABILITY_CACHE[userId];
}

export async function invalidateUserAbilityCacheByRoleId(roleId: string): Promise<void> {
  logger.debug(`Invalidating user ability cache for role ID: ${roleId}`);

  const userRoles = await prisma.userRole.findMany({
    where: { roleId },
    select: { userId: true },
  });

  if (userRoles.length === 0) {
    logger.debug(`No users found for role ID: ${roleId}`);
    return;
  }

  logger.debug(`Found ${userRoles.length} user(s) for role ID: ${roleId}. Invalidating their ability cache.`);

  userRoles.forEach((userRole) => {
    invalidateUserAbilityCache(userRole.userId);
  });

  logger.debug(`Invalidated user ability cache for ${userRoles.length} user(s) associated with role ID: ${roleId}`);
}
