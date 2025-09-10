import { NextRequest, NextResponse } from 'next/server';
import {
  deleteDeploymentMethod,
  getEnvironmentDeploymentMethod,
  getEnvironmentDeploymentMethods,
  updateDeploymentMethod,
} from '~/lib/services/deploymentMethodService';
import { requireUserId } from '~/auth/session';
import { updateDeploymentMethodSchema } from '~/lib/validation/deploymentMethods';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireUserId(request);

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const environmentId = searchParams.get('environmentId');

  if (!environmentId) {
    return NextResponse.json({ success: false, error: 'Environment ID is required' }, { status: 400 });
  }

  const environmentDeploymentMethod = await getEnvironmentDeploymentMethod(id, environmentId);

  if (!environmentDeploymentMethod) {
    return NextResponse.json({ success: false, error: 'Deployment method not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, environmentDeploymentMethod });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireUserId(request);

  const { id } = await params;

  try {
    const body = await request.json();

    // Validate request body with Zod
    const validationResult = updateDeploymentMethodSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      return NextResponse.json({ success: false, error: `Validation failed: ${errorMessages}` }, { status: 400 });
    }

    const { name, provider, credentials } = validationResult.data;

    const deploymentMethod = await updateDeploymentMethod(id, {
      name,
      provider,
      credentials,
    });

    // Return all deployment methods after updating
    const environmentDeploymentMethods = await getEnvironmentDeploymentMethods();

    return NextResponse.json({
      success: true,
      deploymentMethod,
      environmentDeploymentMethods,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update deployment method' },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireUserId(request);

  const { id } = await params;

  try {
    await deleteDeploymentMethod(id);

    // Return all deployment methods after deleting
    const environmentDeploymentMethods = await getEnvironmentDeploymentMethods();

    return NextResponse.json({
      success: true,
      environmentDeploymentMethods,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete deployment method' },
      { status: 400 },
    );
  }
}
