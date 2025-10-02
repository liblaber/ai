/**
 * Shared interface for container implementations (WebContainer and DockerContainer)
 * Provides a unified API for file operations, process spawning, and event handling
 */

import type { EventEmitter } from 'events';
import type { DirEnt, BufferEncoding } from '@webcontainer/api';

/**
 * Container process interface representing a spawned process
 */
export interface ContainerProcess {
  /** Promise that resolves with the process exit code */
  exit: Promise<number>;

  /** Writable stream for sending input to the process */
  input: WritableStreamDefaultWriter<string>;

  /** Readable stream for receiving output from the process */
  output: ReadableStream<string>;

  /** Kills the process */
  kill(): void;

  /** Resizes the terminal dimensions for the process */
  resize?(cols: number, rows: number): void;
}

/**
 * Options for file operations
 */
export interface FileSystemOptions {
  encoding?: string;
  recursive?: boolean;
  force?: boolean;
  withFileTypes?: boolean;
}

/**
 * Options for spawning processes
 */
export interface SpawnOptions {
  env?: Record<string, string>;
  cwd?: string;
  terminal?: {
    cols?: number;
    rows?: number;
  };
}

/**
 * Preview message types (from WebContainer API)
 */
export interface PreviewMessage {
  type: 'PREVIEW_UNCAUGHT_EXCEPTION' | 'PREVIEW_UNHANDLED_REJECTION' | 'PREVIEW_CONSOLE_ERROR' | string;
  message?: string;
  pathname?: string;
  search?: string;
  hash?: string;
  port?: number;
  stack?: string;
  args?: any[];
}

/**
 * Main container interface that both WebContainer and DockerContainer implementations should follow
 */
export interface Container extends EventEmitter {
  /** Working directory path */
  readonly workdir: string;

  // File System Operations

  /**
   * Reads a file from the container file system (returns Uint8Array)
   */
  readFile(path: string, encoding?: null): Promise<Uint8Array>;

  /**
   * Reads a file from the container file system (returns string)
   */
  readFile(path: string, encoding: BufferEncoding): Promise<string>;

  /**
   * Writes content to a file in the container file system
   * @param path - File path relative to workdir
   * @param content - File content to write
   * @param options - Write options including encoding
   */
  writeFile(path: string, content: string | Uint8Array, options?: FileSystemOptions): Promise<void>;

  /**
   * Creates a directory in the container file system
   * @param path - Directory path relative to workdir
   * @param options - Options including recursive flag
   */
  mkdir(path: string, options?: FileSystemOptions): Promise<void>;

  /**
   * Reads directory contents (buffer encoding, no file types)
   */
  readdir(
    path: string,
    options:
      | 'buffer'
      | {
          encoding: 'buffer';
          withFileTypes?: false;
        },
  ): Promise<Uint8Array[]>;

  /**
   * Reads directory contents (string names only)
   */
  readdir(
    path: string,
    options?:
      | {
          encoding?: BufferEncoding | null;
          withFileTypes?: false;
        }
      | BufferEncoding
      | null,
  ): Promise<string[]>;

  /**
   * Reads directory contents (buffer encoding with file types)
   */
  readdir(
    path: string,
    options: {
      encoding: 'buffer';
      withFileTypes: true;
    },
  ): Promise<DirEnt<Uint8Array>[]>;

  /**
   * Reads directory contents (string encoding with file types)
   */
  readdir(
    path: string,
    options: {
      encoding?: BufferEncoding | null;
      withFileTypes: true;
    },
  ): Promise<DirEnt<string>[]>;

  /**
   * Removes a file or directory
   * @param path - Path to remove relative to workdir
   * @param options - Options including recursive and force flags
   */
  rm(path: string, options?: FileSystemOptions): Promise<void>;

  // Process Management

  /**
   * Spawns a process in the container
   * @param command - Command to execute
   * @param args - Command arguments
   * @param options - Spawn options including environment and terminal settings
   * @returns Promise resolving to ContainerProcess instance
   */
  spawn(command: string, args?: string[], options?: SpawnOptions): Promise<ContainerProcess>;

  // Event Handling

  /**
   * Listens for server-ready events
   * @param event - 'server-ready' event name
   * @param listener - Callback function receiving port and URL
   */
  on(event: 'server-ready', listener: (port: number, url: string) => void): this;

  /**
   * Listens for port events (open/close)
   * @param event - 'port' event name
   * @param listener - Callback function receiving port, type, and URL
   */
  on(event: 'port', listener: (port: number, type: 'open' | 'close', url: string) => void): this;

  /**
   * Listens for preview messages from iframe
   * @param event - 'preview-message' event name
   * @param listener - Callback function receiving preview message
   */
  on(event: 'preview-message', listener: (message: PreviewMessage) => void): this;

  /**
   * Generic event listener for other events
   * @param event - Event name
   * @param listener - Event listener function
   */
  on(event: string | symbol, listener: (...args: any[]) => void): this;

  // Utility methods

  /**
   * Emits an event
   * @param event - Event name
   * @param args - Event arguments
   */
  emit(event: string | symbol, ...args: any[]): boolean;

  /**
   * Removes event listeners
   * @param event - Event name
   * @param listener - Listener function to remove
   */
  off(event: string | symbol, listener: (...args: any[]) => void): this;
}
