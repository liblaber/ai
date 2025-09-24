'use client';

import { atom } from 'nanostores';
import type { DockerContainer, DockerContainerCreateRequest, DockerContainerResponse } from '~/types/docker';
import { dockerClient } from '~/lib/docker/docker-client';
import { createScopedLogger } from '~/utils/logger';
import { chatId } from '~/lib/persistence';

const logger = createScopedLogger('DockerContainerStore');

export class DockerContainerStore {
  container = atom<DockerContainer | null>(null);
  baseUrl = atom<string | null>(null);
  isInitializing = atom<boolean>(false);
  error = atom<string | null>(null);

  private _initializationPromise: Promise<void> | null = null;

  async initialize(request?: Partial<DockerContainerCreateRequest>): Promise<void> {
    if (this._initializationPromise) {
      return this._initializationPromise;
    }

    this._initializationPromise = this._initialize(request);

    return this._initializationPromise;
  }

  private async _initialize(request?: Partial<DockerContainerCreateRequest>): Promise<void> {
    const conversationId = chatId.get();

    if (!conversationId) {
      logger.warn('No conversation ID available yet, skipping Docker container initialization');
      return;
    }

    try {
      this.isInitializing.set(true);
      this.error.set(null);

      logger.info(`Initializing Docker container for conversation ${conversationId}`);

      // Check if container already exists
      let containerResponse: DockerContainerResponse;

      try {
        containerResponse = await dockerClient.getContainerByConversationId(conversationId);
        logger.info(`Found existing container for conversation ${conversationId}`);
      } catch {
        // Container doesn't exist, create a new one
        logger.info(`Creating new container for conversation ${conversationId}`);

        const createRequest: DockerContainerCreateRequest = {
          conversationId,
          ...request,
        };

        containerResponse = await dockerClient.createContainer(createRequest);
      }

      this.container.set(containerResponse.container);
      this.baseUrl.set(containerResponse.baseUrl || null);

      logger.info(`Docker container initialized: ${containerResponse.container.name}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Failed to initialize Docker container:', error);
      this.error.set(errorMessage);
      throw error;
    } finally {
      this.isInitializing.set(false);
    }
  }

  async #ensureInitialized(): Promise<void> {
    const conversationId = chatId.get();

    if (!conversationId) {
      throw new Error('No conversation ID available');
    }

    if (!this.container.get()) {
      // Reset initialization promise to allow re-initialization with conversation ID
      this._initializationPromise = null;
      await this.initialize();
    }
  }

  async executeCommand(command: string, workingDirectory?: string): Promise<{ exitCode: number; output: string }> {
    await this.#ensureInitialized();

    const container = this.container.get();

    if (!container) {
      throw new Error('Container not initialized');
    }

    try {
      const result = await dockerClient.executeCommand(container.id, {
        command,
        workingDirectory: workingDirectory || '/app',
      });

      return {
        exitCode: result.exitCode,
        output: result.output,
      };
    } catch (error) {
      logger.error(`Failed to execute command in container ${container.id}:`, error);
      throw error;
    }
  }

  async readFile(path: string): Promise<string> {
    await this.#ensureInitialized();

    const container = this.container.get();

    if (!container) {
      throw new Error('Container not initialized');
    }

    try {
      const result = await dockerClient.readFile(container.id, path);

      return result.file.content || '';
    } catch (error) {
      logger.error(`Failed to read file ${path} in container ${container.id}:`, error);
      throw error;
    }
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.#ensureInitialized();

    const container = this.container.get();

    if (!container) {
      throw new Error('Container not initialized');
    }

    try {
      await dockerClient.writeFile(container.id, path, content);
      logger.debug(`Wrote file ${path} in container ${container.id}`);
    } catch (error) {
      logger.error(`Failed to write file ${path} in container ${container.id}:`, error);
      throw error;
    }
  }

  async deleteFile(path: string): Promise<void> {
    await this.#ensureInitialized();

    const container = this.container.get();

    if (!container) {
      throw new Error('Container not initialized');
    }

    try {
      await dockerClient.deleteFile(container.id, path);
      logger.debug(`Deleted file ${path} in container ${container.id}`);
    } catch (error) {
      logger.error(`Failed to delete file ${path} in container ${container.id}:`, error);
      throw error;
    }
  }

  async listFiles(
    path: string = '/app',
    recursive: boolean = false,
  ): Promise<Array<{ path: string; type: 'file' | 'directory'; size?: number }>> {
    await this.#ensureInitialized();

    const container = this.container.get();

    if (!container) {
      throw new Error('Container not initialized');
    }

    try {
      const result = await dockerClient.listFiles(container.id, path, recursive);

      return result.files.map((file) => ({
        path: file.path,
        type: file.type,
        size: file.size,
      }));
    } catch (error) {
      logger.error(`Failed to list files in ${path} for container ${container.id}:`, error);
      throw error;
    }
  }

  async destroy(): Promise<void> {
    const container = this.container.get();

    if (!container) {
      return;
    }

    try {
      await dockerClient.destroyContainer(container.id);
      this.container.set(null);
      this.baseUrl.set(null);
      this._initializationPromise = null;
      logger.info(`Destroyed container ${container.name}`);
    } catch (error) {
      logger.error(`Failed to destroy container ${container.id}:`, error);
      throw error;
    }
  }

  getContainer(): DockerContainer | null {
    return this.container.get();
  }

  getBaseUrl(): string | null {
    return this.baseUrl.get();
  }

  isReady(): boolean {
    const container = this.container.get();
    return container?.status === 'running';
  }
}

// Singleton instance
export const dockerContainerStore = new DockerContainerStore();
