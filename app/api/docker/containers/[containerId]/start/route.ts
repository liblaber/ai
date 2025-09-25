import { NextRequest, NextResponse } from 'next/server';
import { dockerContainerManager } from '~/lib/docker/container-manager';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('DockerContainerStartAPI');

export async function POST(request: NextRequest, { params }: { params: Promise<{ containerId: string }> }) {
  try {
    const { containerId } = await params;

    const container = await dockerContainerManager.startContainer(containerId);

    logger.info(`Started container ${containerId}`);

    return NextResponse.json({
      container,
      baseUrl: container.ports.length > 0 ? `http://localhost:${container.ports[0].hostPort}` : undefined,
    });
  } catch (error) {
    const { containerId } = await params;
    logger.error(`Failed to start container ${containerId}:`, error);

    return NextResponse.json(
      {
        error: 'Failed to start container',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
