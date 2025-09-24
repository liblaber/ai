import { NextRequest, NextResponse } from 'next/server';
import { dockerContainerManager } from '~/lib/docker/container-manager';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('DockerContainerStopAPI');

interface RouteParams {
  params: {
    containerId: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { containerId } = params;

    const container = await dockerContainerManager.stopContainer(containerId);

    logger.info(`Stopped container ${containerId}`);

    return NextResponse.json({ container });
  } catch (error) {
    logger.error(`Failed to stop container ${params.containerId}:`, error);

    return NextResponse.json(
      {
        error: 'Failed to stop container',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
