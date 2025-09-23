/**
 * Example usage demonstrating how to use the new Container interface
 * This file shows migration patterns from direct WebContainer usage to Container interface
 */

import type { FileMap } from '~/lib/stores/files';
import { container } from '~/lib/webcontainer';
import type { Container } from './container.interface';

/**
 * Example: File operations using the new Container interface
 */
export async function exampleFileOperations() {
  // Get the Container instance (uses WebContainerAdapter internally)
  const containerInstance = await container();

  // File operations using the unified Container interface
  await containerInstance.writeFile('example.txt', 'Hello, Container!');

  const content = await containerInstance.readFile('example.txt', 'utf8');

  console.log('File content:', content);

  // Directory operations
  await containerInstance.mkdir('src', { recursive: true });

  const files = await containerInstance.readdir('.');

  console.log('Directory contents:', files);

  // Process spawning
  const process = await containerInstance.spawn('echo', ['Hello from Container!']);

  // Listen to process output
  process.output.pipeTo(
    new WritableStream({
      write(chunk) {
        console.log('Process output:', chunk);
      },
    }),
  );

  // Wait for process to complete
  const exitCode = await process.exit;
  console.log('Process exited with code:', exitCode);
}

/**
 * Example: Event handling with Container interface
 */
export function exampleEventHandling(containerInstance: Container) {
  // Listen for server-ready events
  containerInstance.on('server-ready', (port, url) => {
    console.log(`Server ready on port ${port}: ${url}`);
  });

  // Listen for port events
  containerInstance.on('port', (port, type, url) => {
    console.log(`Port ${port} ${type}: ${url}`);
  });

  // Listen for preview messages
  containerInstance.on('preview-message', (message) => {
    console.log('Preview message:', message);
  });
}

/**
 * Example: Loading file map using Container interface
 * This is a modernized version of loadFileMapIntoContainer
 */
export async function loadFileMapWithContainer(fileMap: FileMap): Promise<void> {
  const containerInstance = await container();

  // Create directories first
  for (const [key, value] of Object.entries(fileMap)) {
    if (value?.type !== 'folder') {
      continue;
    }

    const folderName = key.startsWith(containerInstance.workdir) ? key.replace(containerInstance.workdir, '') : key;

    await containerInstance.mkdir(folderName, { recursive: true });
  }

  // Then create files
  for (const [key, value] of Object.entries(fileMap)) {
    if (value?.type !== 'file') {
      continue;
    }

    const fileName = key.startsWith(containerInstance.workdir) ? key.replace(containerInstance.workdir, '') : key;

    await containerInstance.writeFile(fileName, value.content, {
      encoding: value.isBinary ? undefined : 'utf8',
    });
  }
}

/**
 * Example: Generic container function that works with any Container implementation
 * This function will work with both WebContainerAdapter and DockerContainer
 */
export async function deployProject(containerInstance: Container, buildCommand: string[]) {
  console.log(`Working directory: ${containerInstance.workdir}`);

  // Install dependencies
  const installProcess = await containerInstance.spawn('npm', ['install']);
  await installProcess.exit;

  // Run build
  const buildProcess = await containerInstance.spawn(buildCommand[0], buildCommand.slice(1));
  await buildProcess.exit;

  // List build output
  const buildFiles = await containerInstance.readdir('dist');
  console.log('Build files:', buildFiles);
}

/**
 * Migration guide:
 *
 * OLD WAY (direct WebContainer):
 * ```ts
 * import { webcontainer } from '~/lib/webcontainer';
 *
 * const wc = await webcontainer();
 * await wc.fs.writeFile('file.txt', 'content');
 * const process = await wc.spawn('npm', ['install']);
 * ```
 *
 * NEW WAY (Container interface):
 * ```ts
 * import { container } from '~/lib/webcontainer';
 *
 * const c = await container();
 * await c.writeFile('file.txt', 'content');
 * const process = await c.spawn('npm', ['install']);
 * ```
 *
 * Benefits of the new approach:
 * - Unified interface that works with both WebContainer and DockerContainer
 * - Cleaner API without nested fs object
 * - Better TypeScript support
 * - Future-proof for different container implementations
 */
