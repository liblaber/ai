import { NextRequest, NextResponse } from 'next/server';
import { deleteEnvironment, getEnvironment, updateEnvironment } from '~/lib/services/environmentService';
import { subject } from '@casl/ability';
import { requireUserAbility } from '~/auth/session';
import { PermissionAction, PermissionResource, Prisma } from '@prisma/client';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userAbility } = await requireUserAbility(request);
  const { id } = await params;

  if (!userAbility.can(PermissionAction.read, subject(PermissionResource.Environment, { id }))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const environment = await getEnvironment(id);

  if (!environment) {
    return NextResponse.json({ success: false, error: 'Environment not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, environment });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userAbility } = await requireUserAbility(request);
  const { id } = await params;

  if (!userAbility.can(PermissionAction.update, subject(PermissionResource.Environment, { id }))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as {
    name: string;
    description?: string;
  };

  try {
    const updatedEnvironment = await updateEnvironment(id, body.name, body.description);

    return NextResponse.json({ success: true, environment: updatedEnvironment });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { success: false, error: 'Environment with this name already exists' },
          { status: 400 },
        );
      }

      if (error.code === 'P2025') {
        return NextResponse.json({ success: false, error: 'Environment not found' }, { status: 404 });
      }
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update environment' },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userAbility } = await requireUserAbility(request);
  const { id } = await params;

  if (!userAbility.can(PermissionAction.delete, subject(PermissionResource.Environment, { id }))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    await deleteEnvironment(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ success: false, error: 'Environment not found' }, { status: 404 });
      }
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete environment' },
      { status: 400 },
    );
  }
}
