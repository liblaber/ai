import { NextRequest, NextResponse } from 'next/server';
import { requireUserAbility } from '~/auth/session';
import { createEnvironmentVariable, getEnvironmentVariables } from '~/lib/services/environmentVariablesService';
import { logger } from '~/utils/logger';
import { PermissionAction, PermissionResource } from '@prisma/client';
import { prisma } from '~/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { userAbility } = await requireUserAbility(request);

    if (!userAbility.can(PermissionAction.read, PermissionResource.EnvironmentVariable)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const environmentId = searchParams.get('environmentId');

    if (!environmentId) {
      return NextResponse.json({ success: false, error: 'Environment ID is required' }, { status: 400 });
    }

    // Check if user has access to this environment
    if (!userAbility.can(PermissionAction.read, PermissionResource.Environment)) {
      return NextResponse.json({ success: false, error: 'Access denied to this environment' }, { status: 403 });
    }

    const environmentVariables = await getEnvironmentVariables(environmentId);

    return NextResponse.json({
      success: true,
      environmentVariables,
    });
  } catch (error) {
    logger.error('Failed to fetch environment variables:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch environment variables' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, userAbility } = await requireUserAbility(request);

    if (!userAbility.can(PermissionAction.create, PermissionResource.EnvironmentVariable)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as {
      key: string;
      value: string;
      type: string;
      environmentId: string;
      description?: string;
    };

    const { key, value, type, environmentId, description } = body;

    if (!key || !value || !type || !environmentId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: key, value, type, environmentId' },
        { status: 400 },
      );
    }

    // Check if user has access to this environment
    if (!userAbility.can(PermissionAction.read, PermissionResource.Environment)) {
      return NextResponse.json({ success: false, error: 'Access denied to this environment' }, { status: 403 });
    }

    // Check if environment variable with this key already exists
    const existingEnvVar = await prisma.environmentVariable.findUnique({
      where: {
        key_environmentId: {
          key,
          environmentId,
        },
      },
    });

    if (existingEnvVar) {
      return NextResponse.json(
        { success: false, error: 'Environment variable with this key already exists' },
        { status: 409 },
      );
    }

    const environmentVariable = await createEnvironmentVariable(
      key,
      value,
      type as any, // Type will be validated by the service
      environmentId,
      userId,
      description,
    );

    return NextResponse.json({
      success: true,
      environmentVariable,
    });
  } catch (error) {
    logger.error('Failed to create environment variable:', error);
    return NextResponse.json({ success: false, error: 'Failed to create environment variable' }, { status: 500 });
  }
}
