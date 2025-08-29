import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createRole, getRoles } from '~/lib/services/roleService';
import { requireUserAbility } from '~/auth/session';
import { PermissionAction, PermissionResource, Prisma, RoleScope } from '@prisma/client';

export async function GET(request: NextRequest) {
  const { userAbility } = await requireUserAbility(request);

  if (!userAbility.can(PermissionAction.read, PermissionResource.AdminApp)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const roles = await getRoles();

  return NextResponse.json({ success: true, roles });
}

const postRequestSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  scope: z.enum([RoleScope.GENERAL, RoleScope.ENVIRONMENT, RoleScope.DATA_SOURCE, RoleScope.WEBSITE]).optional(),
  resourceId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const { userAbility } = await requireUserAbility(request);

  if (!userAbility.can(PermissionAction.create, PermissionResource.AdminApp)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const parsedBody = postRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json({ success: false, error: parsedBody.error.flatten().fieldErrors }, { status: 400 });
  }

  const { name, description, scope, resourceId } = parsedBody.data;

  try {
    const role = await createRole(name, description, scope, resourceId);

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
