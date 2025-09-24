export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: 'creating' | 'running' | 'stopped' | 'error';
  ports: DockerPort[];
  createdAt: Date;
  updatedAt: Date;
  snapshotId?: string;
  conversationId: string;
}

export interface DockerPort {
  containerPort: number;
  hostPort: number;
  protocol: 'tcp' | 'udp';
}

export interface DockerContainerCreateRequest {
  conversationId: string;
  snapshotId?: string;
  image?: string;
  ports?: number[];
  environment?: Record<string, string>;
}

export interface DockerContainerResponse {
  container: DockerContainer;
  baseUrl?: string;
}

export interface DockerShellCommand {
  command: string;
  workingDirectory?: string;
  environment?: Record<string, string>;
}

export interface DockerShellResponse {
  exitCode: number;
  stdout: string;
  stderr: string;
  output: string; // Combined stdout + stderr
}

export interface DockerLogEntry {
  timestamp: Date;
  stream: 'stdout' | 'stderr';
  message: string;
}

export interface DockerFileOperation {
  path: string;
  content?: string;
  encoding?: 'utf8' | 'base64';
}

export interface DockerFileSystemEntry {
  path: string;
  type: 'file' | 'directory';
  size?: number;
  content?: string;
  isBinary?: boolean;
  modifiedAt?: Date;
}

export type DockerContainerEvent =
  | { type: 'container-created'; container: DockerContainer }
  | { type: 'container-started'; container: DockerContainer }
  | { type: 'container-stopped'; container: DockerContainer }
  | { type: 'container-error'; container: DockerContainer; error: string }
  | { type: 'port-ready'; container: DockerContainer; port: number; url: string }
  | { type: 'logs'; container: DockerContainer; logs: DockerLogEntry[] };
