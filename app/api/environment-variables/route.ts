import { NextRequest, NextResponse } from 'next/server';
import { requireUserAbility } from '~/auth/session';
import {
  createEnvironmentVariable,
  getEnvironmentVariablesWithEnvironmentDetails,
} from '~/lib/services/environmentVariablesService';
import { logger } from '~/utils/logger';
import { prisma } from '~/lib/prisma';
import { type EnvironmentVariableType, PermissionAction, PermissionResource } from '@prisma/client';
import { z } from 'zod';
import { subject } from '@casl/ability';

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

    if (!environmentId) {
      return NextResponse.json({ success: false, error: 'Environment ID is required' }, { status: 400 });
    }

    const { userAbility } = await requireUserAbility(request);

    if (userAbility.cannot(PermissionAction.read, subject(PermissionResource.Environment, { id: environmentId }))) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to read environment variables' },
        { status: 403 },
      );
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

    const body = postBodySchema.parse(await request.json());

    const { key, value, type, environmentId, description } = body;

    if (userAbility.cannot(PermissionAction.create, subject(PermissionResource.Environment, { id: environmentId }))) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to create environment variables in this environment' },
        { status: 403 },
      );
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
