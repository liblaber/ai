import { NextRequest, NextResponse } from 'next/server';
import { createEnvironment, getEnvironments } from '~/lib/services/environmentService';
import { requireUserAbility } from '~/auth/session';
import { PermissionAction, PermissionResource, Prisma } from '@prisma/client';

export type CreateEnvironmentResponse =
  | {
      success: true;
      environment?: {
        id: string;
        name: string;
        description?: string;
        createdAt: string;
        updatedAt: string;
      };
    }
  | {
      success: false;
      error: string;
    };

export async function GET(request: NextRequest) {
  const { userAbility } = await requireUserAbility(request);

  if (!userAbility.can(PermissionAction.read, PermissionResource.Environment)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const environments = await getEnvironments();

  return NextResponse.json({ success: true, environments });
}

export async function POST(request: NextRequest) {
  const { userAbility } = await requireUserAbility(request);

  if (!userAbility.can(PermissionAction.create, PermissionResource.Environment)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as {
    name: string;
    description?: string;
  };

  try {
    const environment = await createEnvironment(body.name, body.description);

    return NextResponse.json({ success: true, environment });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { success: false, error: 'Environment with this name already exists' },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create environment' },
      { status: 400 },
    );
  }
}
