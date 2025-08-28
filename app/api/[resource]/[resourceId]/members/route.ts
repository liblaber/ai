import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { type UserProfile, userService } from '~/lib/services/userService';
import { getDataSource } from '~/lib/services/dataSourceService';
import { getEnvironment } from '~/lib/services/environmentService';
import { getWebsite } from '~/lib/services/websiteService';
import { getPermissionLevelDetails, type PermissionLevel } from '~/lib/services/permissionService';
import { findOrCreateResourceRole, type ResourceRoleScope } from '~/lib/services/roleService';
import { requireUserAbility } from '~/auth/session';
import { PermissionAction, PermissionResource, Prisma, RoleScope } from '@prisma/client';
import { subject } from '@casl/ability';

const requestSchema = z.object({
  email: z.string(),
  permissionLevel: z.string(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string; resourceId: string }> },
) {
  try {
    const { userAbility } = await requireUserAbility(request);
    const { resource: resourceParam, resourceId } = await params;
    const resourceConfig = getResourceConfig(resourceParam);
    const body = await request.json();
    const parsedBody = requestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { email, permissionLevel } = parsedBody.data;

    const { fetchFunction, permissionResource, roleScope, resourceLabel } = resourceConfig;

    const resource = await fetchFunction(resourceId);

    if (!resource) {
      return NextResponse.json({ success: false, error: `${resourceLabel} not found` }, { status: 404 });
    }

    if (userAbility.cannot(PermissionAction.manage, subject(permissionResource, resource))) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const permissionLevelDetails = getPermissionLevelDetails(permissionLevel);

    if (!permissionLevelDetails) {
      return NextResponse.json({ success: false, error: 'Invalid permission level' }, { status: 400 });
    }

    const user = await userService.getUserByEmail(email);

    return await assignUserToRole(user, resource, roleScope, permissionLevelDetails.level, resourceLabel);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith('Invalid resource type')) {
        return NextResponse.json({ success: false, error: 'Invalid route' }, { status: 400 });
      }

      if (error.message.includes('not found')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 404 });
      }
    }

    return NextResponse.json({ success: false, error: 'Failed to assign user to role' }, { status: 500 });
  }
}
interface ResourceForPermissionCheck {
  id: string;
  createdById?: string;
}

interface ResourceConfig {
  fetchFunction: (id: string) => Promise<ResourceForPermissionCheck | null>;
  permissionResource: 'DataSource' | 'Environment' | 'Website';
  roleScope: ResourceRoleScope;
  resourceLabel: string;
}

function getResourceConfig(resourceType: string): ResourceConfig {
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
      throw new Error(`Invalid resource type provided: "${resourceType}"`);
  }
}

async function assignUserToRole(
  user: UserProfile,
  resource: any,
  roleScope: ResourceRoleScope,
  permissionLevel: PermissionLevel,
  resourceLabel: string,
): Promise<NextResponse> {
  try {
    const role = await findOrCreateResourceRole(roleScope, resource.id, permissionLevel);

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
