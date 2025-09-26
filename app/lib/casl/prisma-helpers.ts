import { Prisma, PermissionAction } from '@prisma/client';
import { accessibleBy } from '@casl/prisma';
import type { AppAbility } from './user-ability';

export type PrismaResources = 'Environment' | 'DataSource' | 'Website' | 'EnvironmentVariable' | 'Conversation';

type WhereInputForResource<T extends PrismaResources> = T extends 'DataSource'
  ? Prisma.DataSourceWhereInput
  : T extends 'Environment'
    ? Prisma.EnvironmentWhereInput
    : T extends 'Website'
      ? Prisma.WebsiteWhereInput
      : T extends 'EnvironmentVariable'
        ? Prisma.EnvironmentVariableWhereInput
        : T extends 'Conversation'
          ? Prisma.ConversationWhereInput
          : never;

/**
 * Builds a generic Prisma WHERE clause for a given resource based on a user's abilities.
 * @example
 * const where = buildResourceWhereClause(ability, PermissionAction.read, PermissionResource.DataSource);
 * const dataSources = await prisma.dataSource.findMany({ where });
 *
 * @param ability The user's CASL AppAbility instance.
 * @param action The PermissionAction enum value (e.g., read, manage).
 * @param resource The value for the resource (e.g., DataSource).
 * @returns A Prisma WhereInput object for the specified resource, ready to be used in a query.
 */
export function buildResourceWhereClause<T extends PrismaResources>(
  ability: AppAbility,
  action: PermissionAction,
  resource: PrismaResources,
): WhereInputForResource<T> {
  // Get the CASL accessibility rules for the user and action.
  const rules = accessibleBy(ability, action);

  if (!rules[resource]) {
    throw new Error(`No permission rules found for resource: ${resource}`);
  }

  return rules[resource] as WhereInputForResource<T>;
}
