import Docker from 'dockerode';
import { EventEmitter } from 'events';
import { createScopedLogger } from '~/utils/logger';
import type {
  DockerContainer,
  DockerContainerCreateRequest,
  DockerLogEntry,
  DockerPort,
  DockerShellCommand,
  DockerShellResponse,
} from '~/types/docker';

const logger = createScopedLogger('DockerContainerManager');

export class DockerContainerManager extends EventEmitter {
  private _docker: Docker;
  private _containers: Map<string, DockerContainer> = new Map();
  private _containerInstances: Map<string, Docker.Container> = new Map();
  private _networkInitialized: boolean = false;
  private _networkInitializationPromise: Promise<void> | null = null;
  private readonly _networkName: string = 'liblab-ai-network';
  private readonly _baseImage: string = 'liblab-ai-next-starter:latest';

  constructor() {
    super();
    this._docker = new Docker();
  }

  async initializeNetwork(): Promise<void> {
    // If already initialized, return immediately
    if (this._networkInitialized) {
      return;
    }

    // If initialization is in progress, wait for it to complete
    if (this._networkInitializationPromise) {
      await this._networkInitializationPromise;
      return;
    }

    // Start initialization
    this._networkInitializationPromise = this._doInitializeNetwork();

    try {
      await this._networkInitializationPromise;
      this._networkInitialized = true;
    } catch (error) {
      // Reset the promise so it can be retried
      this._networkInitializationPromise = null;
      throw error;
    }
  }

  private async _doInitializeNetwork(): Promise<void> {
    try {
      // Check if network exists, create if it doesn't
      const networks = await this._docker.listNetworks({
        filters: { name: [this._networkName] },
      });

      if (networks.length === 0) {
        await this._docker.createNetwork({
          Name: this._networkName,
          Driver: 'bridge',
        });
        logger.info(`Created Docker network: ${this._networkName}`);
      } else {
        logger.info(`Docker network ${this._networkName} already exists`);
      }
    } catch (error) {
      logger.error('Failed to initialize Docker network:', error);
      throw error;
    }
  }

  async createContainer(request: DockerContainerCreateRequest): Promise<DockerContainer> {
    // Ensure network is initialized before creating containers
    await this.initializeNetwork();

    const containerId = this._generateContainerId(request.conversationId);
    const containerName = `liblab-ai-${containerId}`;

    try {
      logger.info(`Creating container ${containerName} for conversation ${request.conversationId}`);

      // Prepare port mappings
      const exposedPorts: Record<string, {}> = {};
      const portBindings: Record<string, Array<{ HostPort: string }>> = {};
      const ports: DockerPort[] = [];

      const requestPorts = request.ports || [3000, 5173, 8080]; // Default dev server ports

      for (const containerPort of requestPorts) {
        const hostPort = await this._findAvailablePort();
        const portKey = `${containerPort}/tcp`;

        exposedPorts[portKey] = {};
        portBindings[portKey] = [{ HostPort: hostPort.toString() }];

        ports.push({
          containerPort,
          hostPort,
          protocol: 'tcp',
        });
      }

      // Create volume mount for file persistence
      const volumeName = `liblab-ai-app-${containerId}`;
      await this._createVolume(volumeName);

      const containerOptions: Docker.ContainerCreateOptions = {
        Image: request.image || this._baseImage,
        name: containerName,
        ExposedPorts: exposedPorts,
        WorkingDir: '/app',
        HostConfig: {
          PortBindings: portBindings,
          NetworkMode: this._networkName,
          Mounts: [
            {
              Type: 'volume',
              Source: volumeName,
              Target: '/app',
            },
          ],
          AutoRemove: false, // We'll manage cleanup manually
        },
        NetworkingConfig: {
          EndpointsConfig: {
            [this._networkName]: {},
          },
        },
      };

      const dockerContainer = await this._docker.createContainer(containerOptions);

      const container: DockerContainer = {
        id: containerId,
        name: containerName,
        image: request.image || this._baseImage,
        status: 'creating',
        ports,
        createdAt: new Date(),
        updatedAt: new Date(),
        snapshotId: request.snapshotId,
        conversationId: request.conversationId,
      };

      this._containers.set(containerId, container);
      this._containerInstances.set(containerId, dockerContainer);

      this.emit('container-created', { type: 'container-created', container });

      logger.info(`Container ${containerName} created successfully`);

      return container;
    } catch (error) {
      logger.error(`Failed to create container ${containerName}:`, error);
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
      logger.info(`Starting container ${container.name}`);

      await dockerContainer.start();

      container.status = 'running';
      container.updatedAt = new Date();

      this._containers.set(containerId, container);

      // Start monitoring container
      this._monitorContainer(containerId);

      this.emit('container-started', { type: 'container-started', container });

      logger.info(`Container ${container.name} started successfully`);

      return container;
    } catch (error) {
      container.status = 'error';
      container.updatedAt = new Date();
      this._containers.set(containerId, container);

      logger.error(`Failed to start container ${container.name}:`, error);
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
      logger.info(`Stopping container ${container.name}`);

      await dockerContainer.stop({ t: 10 }); // 10 second timeout

      container.status = 'stopped';
      container.updatedAt = new Date();

      this._containers.set(containerId, container);

      this.emit('container-stopped', { type: 'container-stopped', container });

      logger.info(`Container ${container.name} stopped successfully`);

      return container;
    } catch (error) {
      logger.error(`Failed to stop container ${container.name}:`, error);
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
      logger.info(`Destroying container ${container.name}`);

      // Stop if running
      if (container.status === 'running') {
        await this.stopContainer(containerId);
      }

      // Remove container
      await dockerContainer.remove({ force: true });

      // Remove volume
      const volumeName = `liblab-ai-files-${containerId}`;
      await this._removeVolume(volumeName);

      // Clean up local references
      this._containers.delete(containerId);
      this._containerInstances.delete(containerId);

      logger.info(`Container ${container.name} destroyed successfully`);
    } catch (error) {
      logger.error(`Failed to destroy container ${container.name}:`, error);
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
      logger.error(`Failed to execute command in container ${containerId}:`, error);
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
      logger.error(`Failed to get logs for container ${containerId}:`, error);
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
      // Monitor for port readiness
      for (const port of container.ports) {
        this._checkPortReadiness(containerId, port);
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
          logger.error(`Container ${container.name} monitoring error:`, error);
        });
    } catch (error) {
      logger.error(`Failed to start monitoring container ${container.name}:`, error);
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

    logger.warn(`Port ${port.containerPort} on container ${container.name} never became ready`);
  }

  private _generateContainerId(conversationId: string): string {
    return `${conversationId}-${Date.now().toString(36)}`;
  }

  private async _findAvailablePort(startPort: number = 3001): Promise<number> {
    const net = await import('net');

    return new Promise((resolve, reject) => {
      const server = net.createServer();

      server.listen(startPort, () => {
        const port = (server.address() as net.AddressInfo)?.port;
        server.close(() => {
          if (port) {
            resolve(port);
          } else {
            reject(new Error('Failed to find available port'));
          }
        });
      });

      server.on('error', () => {
        // Port is busy, try next one
        this._findAvailablePort(startPort + 1)
          .then(resolve)
          .catch(reject);
      });
    });
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
      logger.warn(`Failed to remove volume ${volumeName}:`, error);
    }
  }
}

// Singleton instance
export const dockerContainerManager = new DockerContainerManager();
