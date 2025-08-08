import { NextRequest, NextResponse } from 'next/server';
import { createRole, getRoles } from '~/lib/services/roleService';
import { organizationService } from '~/lib/services/organizationService';
import { requireUserAbility } from '~/auth/session';
import { PermissionAction, PermissionResource, Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  const { userAbility } = await requireUserAbility(request);

  if (!userAbility.can(PermissionAction.read, PermissionResource.AdminApp)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const roles = await getRoles();

  return NextResponse.json({ success: true, roles });
}

export async function POST(request: NextRequest) {
  const { userId, userAbility } = await requireUserAbility(request);

  if (!userAbility.can(PermissionAction.create, PermissionResource.AdminApp)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as {
    name: string;
    description?: string;
  };

  const organization = await organizationService.getOrganizationByUser(userId);

  if (!organization) {
    return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
  }

  try {
    const role = await createRole(body.name, body.description, organization.id);

    return NextResponse.json({ success: true, role });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({ success: false, error: 'Role with this name already exists' }, { status: 400 });
      }
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create role' },
      { status: 400 },
    );
  }
}
