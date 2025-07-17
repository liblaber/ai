import type { FileMap } from '~/lib/stores/files';
import { injectEnvVariable } from '~/utils/envUtils';
import { webcontainer } from '~/lib/webcontainer/index';
import { detectProjectCommands } from '~/utils/projectCommands';
import { workbenchStore } from '~/lib/stores/workbench';

/**
 * Loads a file map into the web container.
 * @param fileMap - The file map to load.
 */
export const loadFileMapIntoContainer = async (fileMap: FileMap): Promise<void> => {
  const webContainer = await webcontainer;

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

    if (key.endsWith('.env') && import.meta.env.VITE_ENV_NAME === 'local') {
      const tunnelForwardingUrl = import.meta.env.VITE_TUNNEL_FORWARDING_URL;
      value.content = injectEnvVariable(
        value.content,
        'VITE_API_BASE_URL',
        tunnelForwardingUrl ? tunnelForwardingUrl : undefined,
      );
    }

    const fileName = key.startsWith(webContainer.workdir) ? key.replace(webContainer.workdir, '') : key;

    if (fileName === 'package.json') {
      const projectCommands = detectProjectCommands(value);

      if (projectCommands?.startCommand) {
        workbenchStore.startCommand.set(projectCommands.startCommand);
      }
    }

    await webContainer.fs.writeFile(fileName, value.content, { encoding: value.isBinary ? undefined : 'utf8' });
  }
};

export const loadPreviousFileMapIntoContainer = async (previousFileMap: FileMap): Promise<void> => {
  const currentFileMap = workbenchStore.getFileMap();
  const webContainer = await webcontainer;

  // Get all unique file paths from both maps
  const allPaths = new Set([...Object.keys(currentFileMap), ...Object.keys(previousFileMap)]);

  for (const filePath of allPaths) {
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
        // Handle .env file injection for local environment
        let content = previousFile.content;

        if (filePath.endsWith('.env') && import.meta.env.VITE_ENV_NAME === 'local') {
          const tunnelForwardingUrl = import.meta.env.VITE_TUNNEL_FORWARDING_URL;
          content = injectEnvVariable(
            content,
            'VITE_API_BASE_URL',
            tunnelForwardingUrl ? tunnelForwardingUrl : undefined,
          );
        }

        // Handle package.json for start command detection
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
