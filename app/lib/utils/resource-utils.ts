import { prisma } from '~/lib/prisma';
import { PermissionResource, RoleScope } from '@prisma/client';
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
