import { NextRequest, NextResponse } from 'next/server';
import { dockerContainerManager } from '~/lib/docker/container-manager';
import type { DockerFileOperation, DockerFileSystemEntry } from '~/types/docker';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('DockerContainerFilesAPI');

interface RouteParams {
  params: {
    containerId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { containerId } = params;
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '/app';
    const recursive = searchParams.get('recursive') === 'true';

    // List files/directories
    const command = recursive
      ? `find "${path}" -type f -o -type d | head -1000` // Limit to prevent overwhelming response
      : `ls -la "${path}"`;

    const result = await dockerContainerManager.executeCommand(containerId, { command });

    if (result.exitCode !== 0) {
      return NextResponse.json({ error: 'Failed to list files', details: result.stderr }, { status: 400 });
    }

    const files: DockerFileSystemEntry[] = [];

    if (recursive) {
      // Parse find output
      const lines = result.stdout.split('\n').filter((line) => line.trim());

      for (const line of lines) {
        const trimmedPath = line.trim();

        if (trimmedPath) {
          // Check if it's a directory
          const statResult = await dockerContainerManager.executeCommand(containerId, {
            command: `stat -c "%F" "${trimmedPath}"`,
          });

          const isDirectory = statResult.stdout.includes('directory');

          files.push({
            path: trimmedPath,
            type: isDirectory ? 'directory' : 'file',
          });
        }
      }
    } else {
      // Parse ls -la output
      const lines = result.stdout.split('\n').slice(1); // Skip total line

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);

        if (parts.length >= 9) {
          const permissions = parts[0];
          const size = parseInt(parts[4]) || 0;
          const fileName = parts.slice(8).join(' ');

          if (fileName !== '.' && fileName !== '..') {
            files.push({
              path: `${path}/${fileName}`.replace('//', '/'),
              type: permissions.startsWith('d') ? 'directory' : 'file',
              size: permissions.startsWith('d') ? undefined : size,
            });
          }
        }
      }
    }

    return NextResponse.json({ files });
  } catch (error) {
    logger.error(`Failed to list files in container ${params.containerId}:`, error);

    return NextResponse.json(
      {
        error: 'Failed to list files',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { containerId } = params;
    const operation = (await request.json()) as DockerFileOperation;

    if (!operation.path) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 });
    }

    if (operation.content !== undefined) {
      // Write file
      const encoding = operation.encoding || 'utf8';
      let writeCommand: string;

      if (encoding === 'base64') {
        writeCommand = `echo "${operation.content}" | base64 -d > "${operation.path}"`;
      } else {
        // Escape content for shell
        const escapedContent = operation.content.replace(/'/g, "'\"'\"'");
        writeCommand = `cat > "${operation.path}" << 'EOF'\n${escapedContent}\nEOF`;
      }

      // Ensure directory exists
      const dirCommand = `mkdir -p "$(dirname "${operation.path}")"`;
      await dockerContainerManager.executeCommand(containerId, { command: dirCommand });

      const result = await dockerContainerManager.executeCommand(containerId, {
        command: writeCommand,
      });

      if (result.exitCode !== 0) {
        return NextResponse.json({ error: 'Failed to write file', details: result.stderr }, { status: 400 });
      }

      logger.debug(`Wrote file ${operation.path} in container ${containerId}`);

      return NextResponse.json({ success: true });
    } else {
      // Read file
      const result = await dockerContainerManager.executeCommand(containerId, {
        command: `cat "${operation.path}"`,
      });

      if (result.exitCode !== 0) {
        return NextResponse.json({ error: 'Failed to read file', details: result.stderr }, { status: 400 });
      }

      // Check if file is binary
      const fileTypeResult = await dockerContainerManager.executeCommand(containerId, {
        command: `file --mime-type "${operation.path}"`,
      });

      const isBinary =
        !fileTypeResult.stdout.includes('text/') &&
        !fileTypeResult.stdout.includes('application/json') &&
        !fileTypeResult.stdout.includes('application/javascript');

      const fileEntry: DockerFileSystemEntry = {
        path: operation.path,
        type: 'file',
        content: result.stdout,
        isBinary,
      };

      return NextResponse.json({ file: fileEntry });
    }
  } catch (error) {
    logger.error(`Failed to handle file operation in container ${params.containerId}:`, error);

    return NextResponse.json(
      {
        error: 'Failed to handle file operation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { containerId } = params;
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json({ error: 'path parameter is required' }, { status: 400 });
    }

    const result = await dockerContainerManager.executeCommand(containerId, {
      command: `rm -rf "${path}"`,
    });

    if (result.exitCode !== 0) {
      return NextResponse.json({ error: 'Failed to delete file/directory', details: result.stderr }, { status: 400 });
    }

    logger.debug(`Deleted ${path} in container ${containerId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(`Failed to delete file in container ${params.containerId}:`, error);

    return NextResponse.json(
      {
        error: 'Failed to delete file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
