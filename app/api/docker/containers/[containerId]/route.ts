import { NextRequest, NextResponse } from 'next/server';
import { dockerContainerManager } from '~/lib/docker/container-manager';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('DockerContainerAPI');

interface RouteParams {
  params: {
    containerId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { containerId } = params;
    const container = dockerContainerManager.getContainer(containerId);

    if (!container) {
      return NextResponse.json({ error: 'Container not found' }, { status: 404 });
    }

    return NextResponse.json({
      container,
      baseUrl: container.ports.length > 0 ? `http://localhost:${container.ports[0].hostPort}` : undefined,
    });
  } catch (error) {
    logger.error(`Failed to get container ${params.containerId}:`, error);

    return NextResponse.json(
      {
        error: 'Failed to get container',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { containerId } = params;

    await dockerContainerManager.destroyContainer(containerId);

    logger.info(`Destroyed container ${containerId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(`Failed to destroy container ${params.containerId}:`, error);

    return NextResponse.json(
      {
        error: 'Failed to destroy container',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
