'use client';

import type {
  DockerContainer,
  DockerContainerCreateRequest,
  DockerContainerResponse,
  DockerFileOperation,
  DockerFileSystemEntry,
  DockerLogEntry,
  DockerShellCommand,
  DockerShellResponse,
} from '~/types/docker';

interface ApiError {
  details?: string;
  error?: string;
}

export class DockerClient {
  async createContainer(request: DockerContainerCreateRequest): Promise<DockerContainerResponse> {
    const response = await fetch(`/api/docker/containers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = (await response.json()) as ApiError;

      throw new Error(error.details || error.error || 'Failed to create container');
    }

    return response.json();
  }

  async getContainer(containerId: string): Promise<DockerContainerResponse> {
    const response = await fetch(`/api/docker/containers/${containerId}`);

    if (!response.ok) {
      const error = (await response.json()) as ApiError;

      throw new Error(error.details || error.error || 'Failed to get container');
    }

    return response.json();
  }

  async getContainerByConversationId(conversationId: string): Promise<DockerContainerResponse> {
    const response = await fetch(`/api/docker/containers?conversationId=${conversationId}`);

    if (!response.ok) {
      const error = (await response.json()) as ApiError;

      throw new Error(error.details || error.error || 'Failed to get container');
    }

    return response.json();
  }

  async startContainer(containerId: string): Promise<DockerContainerResponse> {
    const response = await fetch(`/api/docker/containers/${containerId}/start`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = (await response.json()) as ApiError;

      throw new Error(error.details || error.error || 'Failed to start container');
    }

    return response.json();
  }

  async stopContainer(containerId: string): Promise<{ container: DockerContainer }> {
    const response = await fetch(`/api/docker/containers/${containerId}/stop`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = (await response.json()) as ApiError;

      throw new Error(error.details || error.error || 'Failed to stop container');
    }

    return response.json();
  }

  async destroyContainer(containerId: string): Promise<{ success: boolean }> {
    const response = await fetch(`/api/docker/containers/${containerId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = (await response.json()) as ApiError;

      throw new Error(error.details || error.error || 'Failed to destroy container');
    }

    return response.json();
  }

  async executeCommand(containerId: string, command: DockerShellCommand): Promise<DockerShellResponse> {
    const response = await fetch(`/api/docker/containers/${containerId}/exec`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      const error = (await response.json()) as ApiError;

      throw new Error(error.details || error.error || 'Failed to execute command');
    }

    return response.json();
  }

  async getContainerLogs(containerId: string, tail: number = 100): Promise<{ logs: DockerLogEntry[] }> {
    const response = await fetch(`/api/docker/containers/${containerId}/logs?tail=${tail}`);

    if (!response.ok) {
      const error = (await response.json()) as ApiError;

      throw new Error(error.details || error.error || 'Failed to get container logs');
    }

    return response.json();
  }

  async listFiles(
    containerId: string,
    path: string = '/app',
    recursive: boolean = false,
  ): Promise<{ files: DockerFileSystemEntry[] }> {
    const params = new URLSearchParams({ path, recursive: recursive.toString() });
    const response = await fetch(`/api/docker/containers/${containerId}/files?${params}`);

    if (!response.ok) {
      const error = (await response.json()) as ApiError;

      throw new Error(error.details || error.error || 'Failed to list files');
    }

    return response.json();
  }

  async readFile(containerId: string, path: string): Promise<{ file: DockerFileSystemEntry }> {
    const response = await fetch(`/api/docker/containers/${containerId}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path } as DockerFileOperation),
    });

    if (!response.ok) {
      const error = (await response.json()) as ApiError;

      throw new Error(error.details || error.error || 'Failed to read file');
    }

    return response.json();
  }

  async writeFile(
    containerId: string,
    path: string,
    content: string,
    encoding: 'utf8' | 'base64' = 'utf8',
  ): Promise<{ success: boolean }> {
    const response = await fetch(`/api/docker/containers/${containerId}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content, encoding } as DockerFileOperation),
    });

    if (!response.ok) {
      const error = (await response.json()) as ApiError;

      throw new Error(error.details || error.error || 'Failed to write file');
    }

    return response.json();
  }

  async deleteFile(containerId: string, path: string): Promise<{ success: boolean }> {
    const response = await fetch(`/api/docker/containers/${containerId}/files?path=${encodeURIComponent(path)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = (await response.json()) as ApiError;

      throw new Error(error.details || error.error || 'Failed to delete file');
    }

    return response.json();
  }
}

// Singleton instance
export const dockerClient = new DockerClient();
