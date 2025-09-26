/**
 * Container abstractions for WebContainer and DockerContainer implementations
 */

// Export types and interfaces
export type {
  Container,
  ContainerProcess,
  FileSystemOptions,
  SpawnOptions,
  PreviewMessage,
} from './container.interface';

// Re-export WebContainer types for convenience
export type { DirEnt, BufferEncoding } from '@webcontainer/api';

// Export implementations
export { DockerContainer } from './docker-container';
export { WebContainerAdapter } from './webcontainer-adapter';
