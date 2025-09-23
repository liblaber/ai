/**
 * WebContainer adapter implementation that wraps the actual WebContainer API
 * to fit our defined Container interface
 */

import { EventEmitter } from 'events';
import type {
  WebContainer,
  WebContainerProcess,
  DirEnt,
  BufferEncoding,
  SpawnOptions as WebContainerSpawnOptions,
  PreviewMessage as WebContainerPreviewMessage,
} from '@webcontainer/api';
import type {
  Container,
  ContainerProcess,
  FileSystemOptions,
  SpawnOptions,
  PreviewMessage,
} from './container.interface';

/**
 * Wrapper for WebContainerProcess to implement our ContainerProcess interface
 */
class WebContainerProcessAdapter implements ContainerProcess {
  constructor(private _webContainerProcess: WebContainerProcess) {}

  get exit(): Promise<number> {
    return this._webContainerProcess.exit;
  }

  get input(): WritableStreamDefaultWriter<string> {
    return this._webContainerProcess.input.getWriter();
  }

  get output(): ReadableStream<string> {
    return this._webContainerProcess.output;
  }

  kill(): void {
    this._webContainerProcess.kill();
  }

  resize(cols: number, rows: number): void {
    this._webContainerProcess.resize({ cols, rows });
  }
}

/**
 * WebContainer adapter that implements the Container interface
 */
export class WebContainerAdapter extends EventEmitter implements Container {
  constructor(private _webContainer: WebContainer) {
    super();
    this._setupEventListeners();
  }

  get workdir(): string {
    return this._webContainer.workdir;
  }

  // File System Operations

  async readFile(path: string, encoding?: string): Promise<string | Uint8Array> {
    if (encoding) {
      return await this._webContainer.fs.readFile(path, encoding as any);
    } else {
      return await this._webContainer.fs.readFile(path);
    }
  }

  async writeFile(path: string, content: string | Uint8Array, options?: FileSystemOptions): Promise<void> {
    await this._webContainer.fs.writeFile(path, content, options);
  }

  async mkdir(path: string, options?: FileSystemOptions): Promise<void> {
    const mkdirOptions: any = {};

    if (options?.recursive !== undefined) {
      mkdirOptions.recursive = options.recursive;
    } else {
      // Default to recursive: true for compatibility
      mkdirOptions.recursive = true;
    }

    await this._webContainer.fs.mkdir(path, mkdirOptions);
  }

  // Readdir overloads matching WebContainer API
  async readdir(
    path: string,
    options:
      | 'buffer'
      | {
          encoding: 'buffer';
          withFileTypes?: false;
        },
  ): Promise<Uint8Array[]>;
  async readdir(
    path: string,
    options?:
      | {
          encoding?: BufferEncoding | null;
          withFileTypes?: false;
        }
      | BufferEncoding
      | null,
  ): Promise<string[]>;
  async readdir(
    path: string,
    options: {
      encoding: 'buffer';
      withFileTypes: true;
    },
  ): Promise<DirEnt<Uint8Array>[]>;
  async readdir(
    path: string,
    options: {
      encoding?: BufferEncoding | null;
      withFileTypes: true;
    },
  ): Promise<DirEnt<string>[]>;
  async readdir(path: string, options?: any): Promise<any> {
    return await this._webContainer.fs.readdir(path, options);
  }

  async rm(path: string, options?: FileSystemOptions): Promise<void> {
    const rmOptions: any = {};

    if (options?.recursive !== undefined) {
      rmOptions.recursive = options.recursive;
    }

    if (options?.force !== undefined) {
      rmOptions.force = options.force;
    }

    await this._webContainer.fs.rm(path, rmOptions);
  }

  // Process Management

  async spawn(command: string, args?: string[], options?: SpawnOptions): Promise<ContainerProcess> {
    const spawnOptions: WebContainerSpawnOptions = {};

    if (options?.env) {
      spawnOptions.env = options.env;
    }

    if (options?.cwd) {
      spawnOptions.cwd = options.cwd;
    }

    if (options?.terminal) {
      spawnOptions.terminal = {
        cols: options.terminal.cols || 80,
        rows: options.terminal.rows || 24,
      };
    }

    const process = await this._webContainer.spawn(command, args || [], spawnOptions);

    return new WebContainerProcessAdapter(process);
  }

  // Event Handling Setup

  private _setupEventListeners(): void {
    // Set up port event listener
    this._webContainer.on('port', (port: number, type: 'open' | 'close', url: string) => {
      this.emit('port', port, type, url);
    });

    // Set up server-ready event listener
    this._webContainer.on('server-ready', (port: number, url: string) => {
      this.emit('server-ready', port, url);
    });

    // Set up preview-message event listener
    this._webContainer.on('preview-message', (message: WebContainerPreviewMessage) => {
      // Convert WebContainer PreviewMessage to our PreviewMessage format
      const adaptedMessage: PreviewMessage = {
        type: message.type,
        message: (message as any).message,
        pathname: (message as any).pathname,
        search: (message as any).search,
        hash: (message as any).hash,
        port: (message as any).port,
        stack: (message as any).stack,
        args: (message as any).args,
      };

      this.emit('preview-message', adaptedMessage);
    });
  }

  // Event listener methods (inherited from EventEmitter)
  on(event: 'server-ready', listener: (port: number, url: string) => void): this;
  on(event: 'port', listener: (port: number, type: 'open' | 'close', url: string) => void): this;
  on(event: 'preview-message', listener: (message: PreviewMessage) => void): this;
  on(event: string | symbol, listener: (...args: any[]) => void): this;
  on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  emit(event: string | symbol, ...args: any[]): boolean {
    return super.emit(event, ...args);
  }

  off(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.off(event, listener);
  }

  /**
   * Static factory method to create a WebContainerAdapter from a WebContainer instance
   */
  static fromWebContainer(webContainer: WebContainer): WebContainerAdapter {
    return new WebContainerAdapter(webContainer);
  }
}
