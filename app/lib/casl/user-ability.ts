import { prisma } from '~/lib/prisma';
import { PureAbility, AbilityBuilder } from '@casl/ability';
import { createPrismaAbility } from '@casl/prisma';
import { PermissionResource, PermissionAction } from '@prisma/client';
import type { PrismaQuery, Subjects } from '@casl/prisma';
import type { DataSource, Environment, EnvironmentVariable, Permission, Website, Conversation } from '@prisma/client';
import type { PrismaResources } from './prisma-helpers';
import { getUserPermissions } from '~/lib/services/permissionService';
import { logger } from '~/utils/logger';

declare global {
  var _abilityCache: Record<string, AppAbility> | undefined;
}

const ABILITY_CACHE = globalThis._abilityCache || (globalThis._abilityCache = {});

type PrismaSubjects = Subjects<{
  Environment: Partial<Environment>;
  DataSource: Partial<DataSource>;
  Website: Partial<Website>;
  EnvironmentVariable: Partial<EnvironmentVariable>;
  Conversation: Partial<Conversation>;
}>;

type NonPrismaSubjects = Exclude<PermissionResource, PrismaResources>;
export type AppSubjects = PrismaSubjects | NonPrismaSubjects;

export type AppAbility = PureAbility<[PermissionAction, AppSubjects], PrismaQuery>;

export function createAbilityForUser(userId: string, permissions: Permission[]): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createPrismaAbility);

  permissions.forEach((permission) => {
    const { action, resource, environmentId, dataSourceId, websiteId, conversationId } = permission as Permission;

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
          // Grant access to environment resources
          can(action, PermissionResource.DataSource, { environments: { some: { environmentId } } });
          can(action, PermissionResource.Website, { environmentId });
          can(action, PermissionResource.EnvironmentVariable, { environmentId });
        } else {
          can(action, PermissionResource.Environment);
          // Grant access to all environment resources
          can(action, PermissionResource.DataSource);
          can(action, PermissionResource.Website);
          can(action, PermissionResource.EnvironmentVariable);
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

      case PermissionResource.Conversation:
        if (conversationId) {
          can(action, PermissionResource.Conversation, { id: conversationId });
        } else {
          can(action, PermissionResource.Conversation);
        }

        break;

      // Add other resource types as needed...
      default:
        logger.warn(`User ability: Unknown resource type '${resource}' for action '${action}'`);
        break;
    }
  });

  // Add ownership rules
  can(PermissionAction.manage, PermissionResource.DataSource, { createdById: userId });
  can(PermissionAction.manage, PermissionResource.Website, { createdById: userId });
  can(PermissionAction.manage, PermissionResource.EnvironmentVariable, { createdById: userId });
  can(PermissionAction.manage, PermissionResource.Conversation, { userId });

  return build();
}

export async function getUserAbility(userId: string): Promise<AppAbility> {
  if (ABILITY_CACHE[userId]) {
    return ABILITY_CACHE[userId];
  }

  const permissions = await getUserPermissions(userId);
  const userAbility = createAbilityForUser(userId, permissions);

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
