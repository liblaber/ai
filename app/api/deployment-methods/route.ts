import { NextRequest, NextResponse } from 'next/server';
import { createDeploymentMethod, getEnvironmentDeploymentMethods } from '~/lib/services/deploymentMethodService';
import { requireUserAbility } from '~/auth/session';
import { PermissionAction, PermissionResource } from '@prisma/client';
import { createDeploymentMethodSchema } from '~/lib/validation/deploymentMethods';

export async function GET(request: NextRequest) {
  const { userAbility } = await requireUserAbility(request);

  if (!userAbility.can(PermissionAction.read, PermissionResource.Environment)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const environmentDeploymentMethods = await getEnvironmentDeploymentMethods();

  return NextResponse.json({ success: true, environmentDeploymentMethods });
}

export async function POST(request: NextRequest) {
  const { userAbility } = await requireUserAbility(request);

  if (!userAbility.can(PermissionAction.create, PermissionResource.Environment)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();

    // Validate request body with Zod
    const validationResult = createDeploymentMethodSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      return NextResponse.json({ success: false, error: `Validation failed: ${errorMessages}` }, { status: 400 });
    }

    const { name, provider, environmentId, credentials, applyToAllEnvironments } = validationResult.data;

    const deploymentMethod = await createDeploymentMethod({
      name,
      provider,
      environmentId,
      credentials,
      applyToAllEnvironments,
    });

    // Return all deployment methods after creating a new one
    const environmentDeploymentMethods = await getEnvironmentDeploymentMethods();

    return NextResponse.json({
      success: true,
      deploymentMethod,
      environmentDeploymentMethods,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create deployment method' },
      { status: 400 },
    );
  }
}
