import { NextRequest, NextResponse } from 'next/server';
import { userService } from '~/lib/services/userService';
import { getResourceRoleByUser } from '~/lib/services/roleService';
import { requireUserAbility } from '~/auth/session';
import { PermissionAction, PermissionResource, Prisma, RoleScope } from '@prisma/client';
import { invalidateUserAbilityCache } from '~/lib/casl/user-ability';
import { prisma } from '~/lib/prisma';
import { subject } from '@casl/ability';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string; resourceId: string; memberId: string }> },
) {
  const { userAbility } = await requireUserAbility(request);
  const { resource, resourceId, memberId } = await params;
  const roleScope = getRoleScope(resource);

  if (!roleScope) {
    return NextResponse.json({ success: false, error: 'Invalid route' }, { status: 400 });
  }

  const role = await getResourceRoleByUser(roleScope, resourceId, memberId);

  if (!role) {
    return NextResponse.json({ success: false, error: 'Role not found' }, { status: 404 });
  }

  if (!role.resourceId) {
    return NextResponse.json({ success: false, error: 'Resource ID missing for scoped role' }, { status: 400 });
  }

  let resourceType: PermissionResource;
  const resourceSubjectData: { id: string; createdById?: string } = { id: role.resourceId };

  switch (role.scope) {
    case RoleScope.ENVIRONMENT: {
      resourceType = PermissionResource.Environment;

      const environment = await prisma.environment.findUnique({
        where: { id: role.resourceId },
        select: { id: true },
      });

      if (!environment) {
        return NextResponse.json({ success: false, error: 'Resource not found' }, { status: 404 });
      }

      break;
    }
    case RoleScope.DATA_SOURCE: {
      resourceType = PermissionResource.DataSource;

      const datasource = await prisma.dataSource.findUnique({
        where: { id: role.resourceId },
        select: { id: true, createdById: true },
      });

      if (!datasource) {
        return NextResponse.json({ success: false, error: 'Resource not found' }, { status: 404 });
      }

      resourceSubjectData.createdById = datasource.createdById;
      break;
    }
    case RoleScope.WEBSITE: {
      resourceType = PermissionResource.Website;

      const website = await prisma.website.findUnique({
        where: { id: role.resourceId },
        select: { id: true, createdById: true },
      });

      if (!website) {
        return NextResponse.json({ success: false, error: 'Resource not found' }, { status: 404 });
      }

      resourceSubjectData.createdById = website.createdById;
      break;
    }

    default:
      return NextResponse.json({ success: false, error: 'Invalid role scope' }, { status: 400 });
  }

  if (!userAbility.can(PermissionAction.manage, subject(resourceType, resourceSubjectData))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    await userService.removeUserFromRole(memberId, role.id);
    invalidateUserAbilityCache(memberId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ success: false, error: 'User not found in this role' }, { status: 404 });
      }
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to remove user from role' },
      { status: 400 },
    );
  }
}

function getRoleScope(resourceType: string) {
  switch (resourceType.toLowerCase()) {
    case 'data-sources':
      return RoleScope.DATA_SOURCE;
    case 'environments':
      return RoleScope.ENVIRONMENT;
    case 'websites':
      return RoleScope.WEBSITE;
    default:
      return null;
  }
}
