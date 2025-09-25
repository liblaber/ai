import { NextRequest, NextResponse } from 'next/server';
import { createScopedLogger } from '~/utils/logger';
import type { DockerContainerCreateRequest } from '~/types/docker';
import { dockerContainerManager } from '~/lib/docker/container-manager';

const logger = createScopedLogger('DockerContainersAPI');

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DockerContainerCreateRequest;

    logger.info(`Creating container for conversation ${body.conversationId}`);

    const container = await dockerContainerManager.createContainer(body);

    // Start the container after creation
    const startedContainer = await dockerContainerManager.startContainer(container.id);

    logger.info(`Created and started container ${container.name}`);

    return NextResponse.json({
      container: startedContainer,
      baseUrl: startedContainer.ports.length > 0 ? `http://localhost:${startedContainer.ports[0].hostPort}` : undefined,
    });
  } catch (error) {
    logger.error('Failed to create container:', error);

    return NextResponse.json(
      {
        error: 'Failed to create container',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    // Dynamic import to ensure this only runs on server side
    const { dockerContainerManager } = await import('~/lib/docker/container-manager');

    if (conversationId) {
      // Get container by conversation ID
      const container = dockerContainerManager.getContainerByConversationId(conversationId);

      if (!container) {
        return NextResponse.json({ error: 'Container not found for conversation' }, { status: 404 });
      }

      return NextResponse.json({
        container,
        baseUrl: container.ports.length > 0 ? `http://localhost:${container.ports[0].hostPort}` : undefined,
      });
    } else {
      // Get all containers
      const containers = dockerContainerManager.getAllContainers();

      return NextResponse.json({
        containers: containers.map((container) => ({
          ...container,
          baseUrl: container.ports.length > 0 ? `http://localhost:${container.ports[0].hostPort}` : undefined,
        })),
      });
    }
  } catch (error) {
    logger.error('Failed to get containers:', error);

    return NextResponse.json(
      {
        error: 'Failed to get containers',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
