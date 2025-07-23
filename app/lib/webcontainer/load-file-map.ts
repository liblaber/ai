'use client';
import type { FileMap } from '~/lib/stores/files';
import { injectEnvVariable } from '~/utils/envUtils';
import { webcontainer } from '~/lib/webcontainer/index';
import { detectProjectCommands } from '~/utils/projectCommands';
import { workbenchStore } from '~/lib/stores/workbench';
import { logger } from '~/utils/logger';

/**
 * Loads a file map into the web container.
 * Assumes that the file system is empty. If it's not, use loadPreviousFileMapIntoContainer instead.
 * @param fileMap - The file map to load.
 */
export const loadFileMapIntoContainer = async (fileMap: FileMap): Promise<void> => {
  logger.info('Loading file map into web container:', JSON.stringify(fileMap, null, 2));

  const webContainer = await webcontainer;

  logger.info('WebContainer instance:', JSON.stringify(webContainer));

  logger.info('Loaded file map into web container:', JSON.stringify(fileMap, null, 2));

  for (const [key, value] of Object.entries(fileMap)) {
    if (value?.type !== 'folder') {
      continue;
    }

    const folderName = key.startsWith(webContainer.workdir) ? key.replace(webContainer.workdir, '') : key;
    await webContainer.fs.mkdir(folderName, { recursive: true });
  }

  for (const [key, value] of Object.entries(fileMap)) {
    if (value?.type !== 'file') {
      continue;
    }

    const fileName = key.startsWith(webContainer.workdir) ? key.replace(webContainer.workdir, '') : key;

    if (fileName === '.env' && process.env.NEXT_PUBLIC_ENV_NAME === 'local') {
      const tunnelForwardingUrl = process.env.NEXT_PUBLIC_TUNNEL_FORWARDING_URL;
      value.content = injectEnvVariable(
        value.content,
        'VITE_API_BASE_URL',
        tunnelForwardingUrl ? tunnelForwardingUrl : undefined,
      );
    }

    if (fileName === 'package.json') {
      const projectCommands = detectProjectCommands(value);

      if (projectCommands?.startCommand) {
        workbenchStore.startCommand.set(projectCommands.startCommand);
      }
    }

    await webContainer.fs.writeFile(fileName, value.content, { encoding: value.isBinary ? undefined : 'utf8' });
  }
};

/**
 * Loads a previous file map into the web container, taking into account the current file map, by:
 * - Removing files that are not present in the previous file map
 * - Updating files that are present in both file maps
 * - Adding files that are present in the previous file map but not in the current file map
 * When the app is running with HMR, this function should be preferred over loadFileMapIntoContainer,
 * because the app will be able to pick up the changes in the file map without crashing.
 * @param previousFileMap - The previous file map to load.
 */
export const loadPreviousFileMapIntoContainer = async (previousFileMap: FileMap): Promise<void> => {
  const currentFileMap = workbenchStore.getFileMap();
  const webContainer = await webcontainer;

  const allUniquePaths = new Set([...Object.keys(currentFileMap), ...Object.keys(previousFileMap)]);

  for (const filePath of allUniquePaths) {
    const currentFile = currentFileMap[filePath];
    const previousFile = previousFileMap[filePath];

    // Case 1: File exists in current but not in previous - remove it
    if (currentFile && !previousFile) {
      try {
        await webContainer.fs.rm(filePath, { recursive: true, force: true });
      } catch (error) {
        // Ignore errors if file doesn't exist
        console.warn(`Failed to remove file ${filePath}:`, error);
      }
      continue;
    }

    // Case 2 & 3: File exists in previous but not in current, OR files are different - use previous
    if (previousFile && (!currentFile || currentFile !== previousFile)) {
      if (previousFile.type === 'folder') {
        await webContainer.fs.mkdir(filePath, { recursive: true });
      } else if (previousFile.type === 'file') {
        let content = previousFile.content;

        if (filePath === '.env' && process.env.NEXT_PUBLIC_ENV_NAME === 'local') {
          const tunnelForwardingUrl = process.env.NEXT_PUBLIC_TUNNEL_FORWARDING_URL;
          content = injectEnvVariable(
            content,
            'VITE_API_BASE_URL',
            tunnelForwardingUrl ? tunnelForwardingUrl : undefined,
          );
        }

        if (filePath === 'package.json') {
          const projectCommands = detectProjectCommands(previousFile);

          if (projectCommands?.startCommand) {
            workbenchStore.startCommand.set(projectCommands.startCommand);
          }
        }

        await webContainer.fs.writeFile(filePath, content, {
          encoding: previousFile.isBinary ? undefined : 'utf8',
        });
      }
    }
  }
};
