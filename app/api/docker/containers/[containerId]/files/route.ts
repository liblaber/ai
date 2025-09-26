import { NextRequest, NextResponse } from 'next/server';
import { dockerContainerManager, NEXT_STARTER_DOCKER_PATH } from '~/lib/docker/container-manager';
import type { DockerFileOperation, DockerFileSystemEntry } from '~/types/docker';
import { createScopedLogger } from '~/utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

const logger = createScopedLogger('DockerContainerFilesAPI');

export async function GET(request: NextRequest, { params }: { params: Promise<{ containerId: string }> }) {
  try {
    const { containerId } = await params;
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
    const { containerId } = await params;
    logger.error(`Failed to list files in container ${containerId}:`, error);

    return NextResponse.json(
      {
        error: 'Failed to list files',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ containerId: string }> }) {
  try {
    const { containerId } = await params;
    const operation = (await request.json()) as DockerFileOperation;

    if (!operation.path) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 });
    }

    if (!operation.content) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    // Define the target directory for the liblab-ai-next-starter
    const starterBasePath = path.resolve(process.cwd(), NEXT_STARTER_DOCKER_PATH);

    // Ensure the operation path is relative and safe
    const relativePath = operation.path.startsWith('/') ? operation.path.slice(1) : operation.path;
    const targetFilePath = path.join(starterBasePath, relativePath);

    // Security check: ensure the target path is within the starter directory
    const resolvedTargetPath = path.resolve(targetFilePath);
    const resolvedBasePath = path.resolve(starterBasePath);

    if (!resolvedTargetPath.startsWith(resolvedBasePath)) {
      return NextResponse.json({ error: 'Invalid file path - path traversal not allowed' }, { status: 400 });
    }

    // Ensure the target directory exists
    const targetDir = path.dirname(resolvedTargetPath);
    await fs.mkdir(targetDir, { recursive: true });

    // Write the file content
    const encoding = operation.encoding || 'utf8';

    if (encoding === 'base64') {
      const buffer = Buffer.from(operation.content, 'base64');
      await fs.writeFile(resolvedTargetPath, buffer);
    } else {
      await fs.writeFile(resolvedTargetPath, operation.content, 'utf8');
    }

    logger.debug(`Successfully wrote file ${operation.path} to ${resolvedTargetPath} for container ${containerId}`);

    return NextResponse.json({
      success: true,
      path: operation.path,
      targetPath: resolvedTargetPath,
    });
  } catch (error) {
    const { containerId } = await params;
    logger.error(`Failed to handle file operation in container ${containerId}:`, error);

    return NextResponse.json(
      {
        error: 'Failed to handle file operation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ containerId: string }> }) {
  try {
    const { containerId } = await params;
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
    const { containerId } = await params;
    logger.error(`Failed to delete file in container ${containerId}:`, error);

    return NextResponse.json(
      {
        error: 'Failed to delete file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
