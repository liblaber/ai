import Docker from 'dockerode';
import fs from 'fs-extra';
import { EventEmitter } from 'events';
import path from 'path';
import type {
  DockerContainer,
  DockerContainerCreateRequest,
  DockerLogEntry,
  DockerPort,
  DockerShellCommand,
  DockerShellResponse,
} from '~/types/docker';

// Directory used for mounting Docker volumes with app files apps/{conversationId}
export const APPS_DIRECTORY = 'apps';

// Next starter template used to bootstrap mounted apps/{conversationId} folder
export const NEXT_STARTER_DOCKER_PATH = 'starters/next-starter-docker';

export class DockerContainerManager extends EventEmitter {
  private _docker: Docker;
  private _containers: Map<string, DockerContainer> = new Map();
  private _containerInstances: Map<string, Docker.Container> = new Map();
  private readonly _baseImage: string = 'liblab-ai-next-starter:latest';
  private _usedPorts: Set<number> = new Set();

  constructor() {
    super();
    this._docker = new Docker();
  }

  async createContainer(request: DockerContainerCreateRequest): Promise<DockerContainer> {
    const containerId = request.conversationId;
    const containerName = `liblab-ai-${containerId}`;
    const hostAppPath = path.resolve(process.cwd(), `${APPS_DIRECTORY}/${containerId}`);
    const starterPath = path.resolve(process.cwd(), NEXT_STARTER_DOCKER_PATH);

    try {
      console.info(`Creating container ${containerName} for conversation ${request.conversationId}`);

      // Bootstrap if app folder does not exist on host
      if (!(await fs.pathExists(hostAppPath)) || (await fs.readdir(hostAppPath)).length === 0) {
        console.info(`Bootstrapping app folder for ${containerName}...`);
        await fs.ensureDir(hostAppPath);
        await fs.copy(starterPath, hostAppPath, { overwrite: true });
        console.info(`Copied starter from ${starterPath} to ${hostAppPath}`);
      }

      // Simple port mapping - only expose port 3000
      const containerPort = 3000;
      const hostPort = await this._findAvailableHostPort();
      console.info(`Allocated host port ${hostPort} for container ${containerName}`);

      const exposedPorts = { '3000/tcp': {} };
      const portBindings = { '3000/tcp': [{ HostPort: hostPort.toString() }] };

      const ports: DockerPort[] = [
        {
          containerPort,
          hostPort,
          protocol: 'tcp',
        },
      ];

      // Create volume for app files
      const volumeName = `liblab-ai-app-${containerId}`;
      await this._createVolume(volumeName);

      const containerOptions: Docker.ContainerCreateOptions = {
        Image: this._baseImage, // Always use the same image
        name: containerName,
        ExposedPorts: exposedPorts,
        WorkingDir: '/app',
        Volumes: {
          ['/app']: {},
          ['/app/node_modules']: {},
        },
        Env: ['CI=true'], // no prompts, stricter handling of warnings, stable logs
        HostConfig: {
          PortBindings: portBindings,
          Binds: [`${path.resolve(process.cwd(), `${APPS_DIRECTORY}/${containerId}`)}:/app`],
          AutoRemove: false, // We'll manage cleanup manually
        },
      };

      const container: DockerContainer = {
        id: containerId,
        name: containerName,
        image: this._baseImage,
        status: 'creating',
        ports,
        createdAt: new Date(),
        updatedAt: new Date(),
        snapshotId: request.snapshotId,
        conversationId: request.conversationId,
      };

      this._containers.set(containerId, container);

      const dockerContainer = await this._docker.createContainer(containerOptions);

      this._containerInstances.set(containerId, dockerContainer);

      this.emit('container-created', { type: 'container-created', container });

      console.info(`Container ${containerName} created successfully`);

      return container;
    } catch (error) {
      console.error(`Failed to create container ${containerName}:`, error);
      throw new Error(`Failed to create container: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async startContainer(containerId: string): Promise<DockerContainer> {
    const container = this._containers.get(containerId);
    const dockerContainer = this._containerInstances.get(containerId);

    if (!container || !dockerContainer) {
      throw new Error(`Container ${containerId} not found`);
    }

    try {
      console.info(`Starting container ${container.name}`);

      await dockerContainer.start();

      container.status = 'running';
      container.updatedAt = new Date();

      this._containers.set(containerId, container);

      // Start monitoring container (intentionally not awaited)
      this._monitorContainer(containerId);

      this.emit('container-started', { type: 'container-started', container });

      console.info(`Container ${container.name} started successfully`);

      return container;
    } catch (error) {
      container.status = 'error';
      container.updatedAt = new Date();
      this._containers.set(containerId, container);

      console.error(`Failed to start container ${container.name}:`, error);
      this.emit('container-error', {
        type: 'container-error',
        container,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  async stopContainer(containerId: string): Promise<DockerContainer> {
    const container = this._containers.get(containerId);
    const dockerContainer = this._containerInstances.get(containerId);

    if (!container || !dockerContainer) {
      throw new Error(`Container ${containerId} not found`);
    }

    try {
      console.info(`Stopping container ${container.name}`);

      await dockerContainer.stop({ t: 10 }); // 10 second timeout

      container.status = 'stopped';
      container.updatedAt = new Date();

      this._containers.set(containerId, container);

      this.emit('container-stopped', { type: 'container-stopped', container });

      console.info(`Container ${container.name} stopped successfully`);

      return container;
    } catch (error) {
      console.error(`Failed to stop container ${container.name}:`, error);
      throw error;
    }
  }

  async destroyContainer(containerId: string): Promise<void> {
    const container = this._containers.get(containerId);
    const dockerContainer = this._containerInstances.get(containerId);

    if (!container || !dockerContainer) {
      throw new Error(`Container ${containerId} not found`);
    }

    try {
      console.info(`Destroying container ${container.name}`);

      // Stop if running
      if (container.status === 'running') {
        await this.stopContainer(containerId);
      }

      // Remove container
      await dockerContainer.remove({ force: true });

      // Remove volume
      const volumeName = `liblab-ai-app-${containerId}`;
      await this._removeVolume(volumeName);

      // Clean up local references and free up ports
      container.ports.forEach((port) => {
        this._usedPorts.delete(port.hostPort);
      });
      this._containers.delete(containerId);
      this._containerInstances.delete(containerId);

      console.info(`Container ${container.name} destroyed successfully`);
    } catch (error) {
      console.error(`Failed to destroy container ${container.name}:`, error);
      throw error;
    }
  }

  async executeCommand(containerId: string, command: DockerShellCommand): Promise<DockerShellResponse> {
    const dockerContainer = this._containerInstances.get(containerId);

    if (!dockerContainer) {
      throw new Error(`Container ${containerId} not found`);
    }

    try {
      const exec = await dockerContainer.exec({
        Cmd: ['/bin/sh', '-c', command.command],
        AttachStdout: true,
        AttachStderr: true,
        WorkingDir: command.workingDirectory || '/app',
        Env: command.environment ? Object.entries(command.environment).map(([k, v]) => `${k}=${v}`) : undefined,
      });

      const stream = await exec.start({ hijack: true, stdin: false });

      let stdout = '';
      let stderr = '';

      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];

        stream.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        stream.on('end', async () => {
          try {
            // Parse Docker stream format
            const buffer = Buffer.concat(chunks);
            let offset = 0;

            while (offset < buffer.length) {
              if (offset + 8 > buffer.length) {
                break;
              }

              const streamType = buffer.readUInt8(offset);
              const size = buffer.readUInt32BE(offset + 4);

              if (offset + 8 + size > buffer.length) {
                break;
              }

              const data = buffer.subarray(offset + 8, offset + 8 + size).toString();

              if (streamType === 1) {
                stdout += data;
              } else if (streamType === 2) {
                stderr += data;
              }

              offset += 8 + size;
            }

            const inspect = await exec.inspect();
            const exitCode = inspect.ExitCode || 0;

            resolve({
              exitCode,
              stdout: stdout.trim(),
              stderr: stderr.trim(),
              output: (stdout + stderr).trim(),
            });
          } catch (error) {
            reject(error);
          }
        });

        stream.on('error', reject);
      });
    } catch (error) {
      console.error(`Failed to execute command in container ${containerId}:`, error);
      throw error;
    }
  }

  async getContainerLogs(containerId: string, tail: number = 100): Promise<DockerLogEntry[]> {
    const dockerContainer = this._containerInstances.get(containerId);

    if (!dockerContainer) {
      throw new Error(`Container ${containerId} not found`);
    }

    try {
      const logStream = await dockerContainer.logs({
        stdout: true,
        stderr: true,
        tail,
        timestamps: true,
      });

      const logs: DockerLogEntry[] = [];
      const buffer = logStream as Buffer;

      // Parse Docker log format
      let offset = 0;

      while (offset < buffer.length) {
        if (offset + 8 > buffer.length) {
          break;
        }

        const streamType = buffer.readUInt8(offset);
        const size = buffer.readUInt32BE(offset + 4);

        if (offset + 8 + size > buffer.length) {
          break;
        }

        const logLine = buffer.subarray(offset + 8, offset + 8 + size).toString();
        const timestampMatch = logLine.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s(.*)$/);

        if (timestampMatch) {
          logs.push({
            timestamp: new Date(timestampMatch[1]),
            stream: streamType === 1 ? 'stdout' : 'stderr',
            message: timestampMatch[2],
          });
        }

        offset += 8 + size;
      }

      return logs;
    } catch (error) {
      console.error(`Failed to get logs for container ${containerId}:`, error);
      throw error;
    }
  }

  getContainer(containerId: string): DockerContainer | undefined {
    return this._containers.get(containerId);
  }

  getContainerByConversationId(conversationId: string): DockerContainer | undefined {
    return Array.from(this._containers.values()).find((container) => container.conversationId === conversationId);
  }

  getAllContainers(): DockerContainer[] {
    return Array.from(this._containers.values());
  }

  private async _monitorContainer(containerId: string): Promise<void> {
    const container = this._containers.get(containerId);
    const dockerContainer = this._containerInstances.get(containerId);

    if (!container || !dockerContainer) {
      return;
    }

    try {
      // Monitor for port readiness (async, don't block)
      for (const port of container.ports) {
        this._checkPortReadiness(containerId, port).catch((error) => {
          console.error(`Failed to check port readiness for ${port.containerPort}:`, error);
        });
      }

      // Monitor container status
      dockerContainer
        .wait()
        .then(async () => {
          const updatedContainer = this._containers.get(containerId);

          if (updatedContainer) {
            updatedContainer.status = 'stopped';
            updatedContainer.updatedAt = new Date();
            this._containers.set(containerId, updatedContainer);

            this.emit('container-stopped', { type: 'container-stopped', container: updatedContainer });
          }
        })
        .catch((error) => {
          console.error(`Container ${container.name} monitoring error:`, error);
        });
    } catch (error) {
      console.error(`Failed to start monitoring container ${container.name}:`, error);
    }
  }

  private async _checkPortReadiness(containerId: string, port: DockerPort): Promise<void> {
    const container = this._containers.get(containerId);

    if (!container) {
      return;
    }

    const maxAttempts = 30;
    const delay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(`http://localhost:${port.hostPort}`, {
          method: 'GET',
          signal: AbortSignal.timeout(2000),
        });

        if (response.ok || response.status < 500) {
          const url = `http://localhost:${port.hostPort}`;
          this.emit('port-ready', {
            type: 'port-ready',
            container,
            port: port.containerPort,
            url,
          });

          return;
        }
      } catch {
        // Port not ready yet, continue checking
      }

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    console.warn(`Port ${port.containerPort} on container ${container.name} never became ready`);
  }

  private async _findAvailableHostPort(startPort: number = 3001): Promise<number> {
    const net = await import('net');

    for (let port = startPort; port <= startPort + 999; port++) {
      // Skip if we've already allocated this port
      if (this._usedPorts.has(port)) {
        continue;
      }

      // Test if port is available
      const isAvailable = await new Promise<boolean>((resolve) => {
        const server = net.createServer();

        server.listen(port, () => {
          server.close(() => {
            resolve(true);
          });
        });

        server.on('error', () => {
          resolve(false);
        });
      });

      if (isAvailable) {
        // Mark port as used and return it
        this._usedPorts.add(port);
        return port;
      }
    }

    throw new Error(`No available ports found in range ${startPort}-${startPort + 100}`);
  }

  private async _createVolume(volumeName: string): Promise<void> {
    try {
      await this._docker.createVolume({ Name: volumeName });
    } catch (error: any) {
      // Volume might already exist
      if (!error.message?.includes('already exists')) {
        throw error;
      }
    }
  }

  private async _removeVolume(volumeName: string): Promise<void> {
    try {
      const volume = this._docker.getVolume(volumeName);
      await volume.remove();
    } catch (error) {
      console.warn(`Failed to remove volume ${volumeName}:`, error);
    }
  }
}

// Singleton instance
export const dockerContainerManager = new DockerContainerManager();
