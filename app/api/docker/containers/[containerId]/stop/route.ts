import { NextRequest, NextResponse } from 'next/server';
import { dockerContainerManager } from '~/lib/docker/container-manager';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('DockerContainerStopAPI');

export async function POST(request: NextRequest, { params }: { params: Promise<{ containerId: string }> }) {
  try {
    const { containerId } = await params;

    const container = await dockerContainerManager.stopContainer(containerId);

    logger.info(`Stopped container ${containerId}`);

    return NextResponse.json({ container });
  } catch (error) {
    const { containerId } = await params;
    logger.error(`Failed to stop container ${containerId}:`, error);

    return NextResponse.json(
      {
        error: 'Failed to stop container',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
