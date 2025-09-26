import { NextRequest, NextResponse } from 'next/server';
import { createScopedLogger } from '~/utils/logger';
import type { DockerContainerCreateRequest } from '~/types/docker';
import { dockerContainerManager } from '~/lib/docker/container-manager';

const logger = createScopedLogger('DockerContainersAPI');

async function createContainer(body: DockerContainerCreateRequest) {
  try {
    logger.info(`Creating container for conversation ${body.conversationId}`);

    const container = await dockerContainerManager.createContainer(body);

    logger.info(`Created and started container ${container.name}`);
  } catch (error) {
    logger.error('Failed to create and start container:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DockerContainerCreateRequest;

    // Fire and forget, let the container build in the background
    void createContainer(body);

    return NextResponse.json({ status: 'creating', containerId: body.conversationId }, { status: 202 });
  } catch (error) {
    logger.error('Failed to acknowledge container creation request:', error);

    return NextResponse.json(
      {
        error: 'Failed to acknowledge container creation request',
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
