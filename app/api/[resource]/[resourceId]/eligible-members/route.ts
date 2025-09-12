import { NextRequest, NextResponse } from 'next/server';
import { getResourceConfig, getEligibleMembersForResource } from '~/lib/utils/resource-utils';
import { requireUserAbility } from '~/auth/session';
import { PermissionAction, Prisma } from '@prisma/client';
import { subject } from '@casl/ability';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string; resourceId: string }> },
) {
  try {
    const { userAbility } = await requireUserAbility(request);
    const { resource, resourceId } = await params;
    const resourceConfig = getResourceConfig(resource);

    const { fetchResource, permissionResource, roleScope } = resourceConfig;

    const resourceData = await fetchResource(resourceId);

    if (userAbility.cannot(PermissionAction.read, subject(permissionResource, resourceData))) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const eligibleMembers = await getEligibleMembersForResource(resourceId, roleScope, permissionResource);

    return NextResponse.json({ success: true, eligibleMembers });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid resource type')) {
      return NextResponse.json({ success: false, error: 'Invalid route' }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: `${error.meta?.modelName || 'Resource'} not found` },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: false, error: 'Failed to retrieve eligible members' }, { status: 500 });
  }
}
