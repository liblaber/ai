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
