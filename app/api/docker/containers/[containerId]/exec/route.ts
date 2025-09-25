import { NextRequest, NextResponse } from 'next/server';
import { dockerContainerManager } from '~/lib/docker/container-manager';
import type { DockerShellCommand } from '~/types/docker';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('DockerContainerExecAPI');

export async function POST(request: NextRequest, { params }: { params: Promise<{ containerId: string }> }) {
  try {
    const { containerId } = await params;
    const command = (await request.json()) as DockerShellCommand;

    if (!command.command) {
      return NextResponse.json({ error: 'command is required' }, { status: 400 });
    }

    const result = await dockerContainerManager.executeCommand(containerId, command);

    logger.debug(`Executed command in container ${containerId}: ${command.command}`);

    return NextResponse.json(result);
  } catch (error) {
    const { containerId } = await params;
    logger.error(`Failed to execute command in container ${containerId}:`, error);

    return NextResponse.json(
      {
        error: 'Failed to execute command',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
