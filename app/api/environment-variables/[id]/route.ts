import { NextRequest, NextResponse } from 'next/server';
import { requireUserAbility } from '~/auth/session';
import { prisma } from '~/lib/prisma';
import { deleteEnvironmentVariable, updateEnvironmentVariable } from '~/lib/services/environmentVariablesService';
import { logger } from '~/utils/logger';
import { PermissionAction, PermissionResource } from '@prisma/client';
import { subject } from '@casl/ability';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userAbility } = await requireUserAbility(request);

    const { id } = await params;

    if (userAbility.cannot(PermissionAction.update, PermissionResource.EnvironmentVariable)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as {
      key: string;
      environmentId: string;
      value: string;
      type: string;
      description?: string;
    };

    const { key, environmentId, value, type, description } = body;

    if (!key || !value || !type) {
      return NextResponse.json({ success: false, error: 'Missing required fields: key, value, type' }, { status: 400 });
    }

    // Check if user has access to this environment variable
    const envVar = await prisma.environmentVariable.findUnique({
      where: { id },
      include: {
        environment: true,
      },
    });

    if (!envVar) {
      return NextResponse.json({ success: false, error: 'Environment variable not found' }, { status: 404 });
    }

    const updatedEnvironmentId = environmentId || envVar.environmentId;

    if (
      userAbility.cannot(
        PermissionAction.read,
        subject(PermissionResource.Environment, { environmentId: updatedEnvironmentId }),
      )
    ) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to update environment variable for this environment' },
        { status: 403 },
      );
    }

    // Check if key already exists for this environment (excluding current env var)
    const existingEnvVar = await prisma.environmentVariable.findFirst({
      where: {
        key,
        environmentId: updatedEnvironmentId,
        id: { not: id },
      },
    });

    if (existingEnvVar) {
      return NextResponse.json(
        { success: false, error: 'Environment variable with this key already exists' },
        { status: 409 },
      );
    }

    const updatedEnvironmentVariable = await updateEnvironmentVariable(
      id,
      key,
      value,
      type as any, // Type will be validated by the service
      environmentId || envVar.environmentId,
      description,
    );

    return NextResponse.json({
      success: true,
      environmentVariable: updatedEnvironmentVariable,
    });
  } catch (error) {
    logger.error('Failed to update environment variable:', error);
    return NextResponse.json({ success: false, error: 'Failed to update environment variable' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userAbility } = await requireUserAbility(request);

    const { id } = await params;

    if (userAbility.cannot(PermissionAction.delete, PermissionResource.EnvironmentVariable)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Check if user has access to this environment variable
    const envVar = await prisma.environmentVariable.findUnique({
      where: { id },
      include: {
        environment: true,
      },
    });

    if (!envVar) {
      return NextResponse.json({ success: false, error: 'Environment variable not found' }, { status: 404 });
    }

    if (
      userAbility.cannot(
        PermissionAction.read,
        subject(PermissionResource.Environment, { environmentId: envVar.environmentId }),
      )
    ) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to delete environment variable in this environment' },
        { status: 403 },
      );
    }

    await deleteEnvironmentVariable(id);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    logger.error('Failed to delete environment variable:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete environment variable' }, { status: 500 });
  }
}
