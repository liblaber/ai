import { NextRequest, NextResponse } from 'next/server';
import { requireUserAbility } from '~/auth/session';
import {
  createEnvironmentVariable,
  getEnvironmentVariablesWithEnvironmentDetails,
} from '~/lib/services/environmentVariablesService';
import { logger } from '~/utils/logger';
import { type EnvironmentVariableType, PermissionAction, PermissionResource } from '@prisma/client';
import { z } from 'zod';

const postBodySchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
  type: z.enum(['GLOBAL', 'DATA_SOURCE']),
  environmentId: z.string().min(1),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const environmentId = searchParams.get('environmentId');
    const type = searchParams.get('type') as EnvironmentVariableType | null;

    // Check if user has permission to read environment variables
    const { userAbility } = await requireUserAbility(request);

    if (!userAbility.can(PermissionAction.read, PermissionResource.EnvironmentVariable)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to read environment variables' },
        { status: 403 },
      );
    }

    if (!environmentId) {
      return NextResponse.json({ success: false, error: 'Environment ID is required' }, { status: 400 });
    }

    const environmentVariables = await getEnvironmentVariablesWithEnvironmentDetails(environmentId, type);

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

    const body = postBodySchema.parse(await request.json());

    const { key, value, type, environmentId, description } = body;

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
      type as EnvironmentVariableType,
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
