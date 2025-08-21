import { NextRequest, NextResponse } from 'next/server';
import { userService, type UserProfile } from '~/lib/services/userService';
import { getDataSource } from '~/lib/services/datasourceService';
import { getEnvironment } from '~/lib/services/environmentService';
import { getWebsite } from '~/lib/services/websiteService';
import { getPermissionLevelDetails, type PermissionLevel } from '~/lib/services/permissionService';
import { findOrCreateResourceRole, type ResourceRoleScope } from '~/lib/services/roleService';
import { requireUserAbility } from '~/auth/session';
import { PermissionAction, PermissionResource, Prisma, RoleScope } from '@prisma/client';
import { subject } from '@casl/ability';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string; resourceId: string }> },
) {
  const { userAbility } = await requireUserAbility(request);
  const { resource: resourceParam, resourceId } = await params;
  const resourceConfig = getResourceConfig(resourceParam);

  if (!resourceConfig) {
    return NextResponse.json({ success: false, error: 'Invalid route' }, { status: 400 });
  }

  const { fetchFunction, permissionResource, roleScope, resourceLabel } = resourceConfig;

  const resource = await fetchFunction(resourceId);

  if (!resource) {
    return NextResponse.json({ success: false, error: `${resourceLabel} not found` }, { status: 404 });
  }

  if (userAbility.cannot(PermissionAction.manage, subject(permissionResource, resource))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as {
    email: string;
    permissionLevel: string;
  };

  const permissionLevelDetails = getPermissionLevelDetails(body.permissionLevel);

  if (!permissionLevelDetails) {
    return NextResponse.json({ success: false, error: 'Invalid permission level' }, { status: 400 });
  }

  const user = await userService.getUserByEmail(body.email);

  if (!user) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  }

  return await assignUserToRole(
    user,
    resource,
    roleScope,
    permissionLevelDetails.level,
    user.organizationId,
    resourceLabel,
  );
}

interface ResourceConfig {
  fetchFunction: (id: string) => Promise<any>;
  permissionResource: PermissionResource;
  roleScope: ResourceRoleScope;
  resourceLabel: string;
}

function getResourceConfig(resourceType: string): ResourceConfig | null {
  switch (resourceType.toLowerCase()) {
    case 'data-sources':
      return {
        fetchFunction: getDataSource,
        permissionResource: PermissionResource.DataSource,
        roleScope: RoleScope.DATA_SOURCE,
        resourceLabel: 'Data source',
      };
    case 'environments':
      return {
        fetchFunction: getEnvironment,
        permissionResource: PermissionResource.Environment,
        roleScope: RoleScope.ENVIRONMENT,
        resourceLabel: 'Environment',
      };
    case 'websites':
      return {
        fetchFunction: getWebsite,
        permissionResource: PermissionResource.Website,
        roleScope: RoleScope.WEBSITE,
        resourceLabel: 'Website',
      };
    default:
      return null;
  }
}

async function assignUserToRole(
  user: UserProfile,
  resource: any,
  roleScope: ResourceRoleScope,
  permissionLevel: PermissionLevel,
  organizationId: string,
  resourceLabel: string,
): Promise<NextResponse> {
  try {
    const role = await findOrCreateResourceRole(roleScope, resource.id, permissionLevel, organizationId);

    if (!role) {
      return NextResponse.json({ success: false, error: 'Role not found or could not be created' }, { status: 404 });
    }

    const userProfile = await userService.addUserToRole(user.id, role.id);

    return NextResponse.json({ success: true, user: userProfile });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'User already exists in this role' }, { status: 400 });
    }

    const errorMessage = error instanceof Error ? error.message : `Failed to add user to role for ${resourceLabel}`;

    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
