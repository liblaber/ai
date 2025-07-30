'use client';

import { path as nodePath } from '~/utils/path';
import { atom, map, type MapStore } from 'nanostores';
import type { ActionAlert, FileHistory, LiblabAction } from '~/types/actions';
import { createScopedLogger } from '~/utils/logger';
import { unreachable } from '~/utils/unreachable';
import type { ActionCallbackData } from './message-parser';
import { LiblabShell } from '~/utils/shell';
import { injectEnvVariable } from '~/utils/envUtils';
import { webcontainer as webcontainerPromise } from '~/lib/webcontainer';
import { workbenchStore } from '~/lib/stores/workbench';
import { getBaseUrl } from '~/lib/utils/tunnel';

const logger = createScopedLogger('ActionRunner');

export type ActionStatus = 'pending' | 'running' | 'complete' | 'aborted' | 'failed';

export type BaseActionState = LiblabAction & {
  status: Exclude<ActionStatus, 'failed'>;
  abort: () => void;
  executed: boolean;
  abortSignal: AbortSignal;
};

export type FailedActionState = LiblabAction &
  Omit<BaseActionState, 'status'> & {
    status: Extract<ActionStatus, 'failed'>;
    error: string;
  };

export type ActionState = BaseActionState | FailedActionState;

type BaseActionUpdate = Partial<Pick<BaseActionState, 'status' | 'abort' | 'executed'>>;

export type ActionStateUpdate =
  | BaseActionUpdate
  | (Omit<BaseActionUpdate, 'status'> & { status: 'failed'; error: string });

type ActionsMap = MapStore<Record<string, ActionState>>;

class ActionCommandError extends Error {
  readonly _output: string;
  readonly _header: string;

  // Optional: Add a method to get just the terminal output
  get output() {
    return this._output;
  }

  get header() {
    return this._header;
  }

  constructor(message: string, output: string) {
    // Create a formatted message that includes both the error message and output
    const formattedMessage = `Failed To Execute Shell Command: ${message}\n\nOutput:\n${output}`;
    super(formattedMessage);

    // Set the output separately so it can be accessed programmatically
    this._header = message;
    this._output = output;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, ActionCommandError.prototype);

    // Set the name of the error for better debugging
    this.name = 'ActionCommandError';
  }
}

export class ActionRunner {
  runnerId = atom<string>(`${Date.now()}`);
  actions: ActionsMap = map({});
  onAlert?: (alert: ActionAlert) => void;
  buildOutput?: { path: string; exitCode: number; output: string };
  #currentExecutionPromise: Promise<void> = Promise.resolve();
  #shells: LiblabShell[] = [];

  constructor(getShells: () => LiblabShell[], onAlert?: (alert: ActionAlert) => void) {
    this.onAlert = onAlert;

    // Initialize with the first shell instance
    this.#shells = getShells();
  }

  static async isAppRunning(): Promise<boolean> {
    const runningAppPid = await ActionRunner.getRunningAppPid();

    return !!runningAppPid;
  }

  static async getRunningAppPid() {
    const webcontainer = await webcontainerPromise();
    logger.debug('Getting PID of the running app process');

    const { output } = await webcontainer.spawn('ps', ['-ef']);
    const outputResult = await output.getReader().read();
    const pid = this.#getCommandPid(workbenchStore.startCommand.get(), outputResult.value);

    if (pid) {
      logger.debug(`Found PID (${pid}) of the running app process`);
    } else {
      logger.debug('No running app process');
    }

    return pid;
  }

  static #getCommandPid(targetCommand: string, psOutput?: string): number | null {
    if (!psOutput) {
      return null;
    }

    const lines = psOutput.trim().split('\n');

    // Skip the header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(/\s+/);

      // PID is the second column (index 1)
      if (parts.length >= 2) {
        const pid = parseInt(parts[1], 10);
        const cmd = parts.slice(7).join(' '); // Command starts from column 8

        if (cmd.includes(targetCommand)) {
          return pid;
        }
      }
    }

    return null;
  }

  async addAction(data: ActionCallbackData) {
    const { actionId } = data;

    const actions = this.actions.get();
    const action = actions[actionId];

    if (action) {
      // action already added
      return;
    }

    if (data.action.content === workbenchStore.startCommand.get() && (await ActionRunner.isAppRunning())) {
      logger.debug('Application is already running');
      return;
    }

    const abortController = new AbortController();

    this.actions.setKey(actionId, {
      ...data.action,
      status: data.shouldExecute ? 'pending' : 'complete',
      executed: !data.shouldExecute,
      abort: () => {
        abortController.abort();
        this.#updateAction(actionId, { status: 'aborted' });
      },
      abortSignal: abortController.signal,
    });

    if (data.shouldExecute) {
      this.#currentExecutionPromise.then(() => {
        this.#updateAction(actionId, { status: 'running' });
      });
    }
  }

  async runAction(data: ActionCallbackData, isStreaming: boolean = false) {
    const { actionId } = data;
    const action = this.actions.get()[actionId];

    if (!action) {
      unreachable(`Action ${actionId} not found`);
    }

    if (action.executed) {
      return; // No return value here
    }

    if (isStreaming && action.type !== 'file') {
      return; // No return value here
    }

    this.#updateAction(actionId, { ...action, ...data.action, executed: !isStreaming });

    this.#currentExecutionPromise = this.#currentExecutionPromise
      .then(() => {
        return this.#executeAction(actionId, isStreaming);
      })
      .catch((error) => {
        console.error('Action failed:', error);
      });

    await this.#currentExecutionPromise;

    return;
  }

  async getFileHistory(filePath: string): Promise<FileHistory | null> {
    try {
      const webcontainer = await webcontainerPromise();
      const historyPath = this.#getHistoryPath(filePath);
      const content = await webcontainer.fs.readFile(historyPath, 'utf-8');

      return JSON.parse(content);
    } catch (error) {
      logger.error('Failed to get file history:', error);
      return null;
    }
  }

  async saveFileHistory(filePath: string, history: FileHistory) {
    const historyPath = this.#getHistoryPath(filePath);

    await this.#runFileAction({
      type: 'file',
      filePath: historyPath,
      content: JSON.stringify(history),
      changeSource: 'auto-save',
    } as any);
  }

  async #availableShellTerminal(): Promise<LiblabShell> {
    const availableShell = this.#shells.find((shell) => {
      const state = shell.executionState.get();

      return !state?.active;
    });

    if (availableShell) {
      return availableShell;
    }

    /*
     * if there are no available instances, we will take the last one and abort the process
     * ideally, we would create a new terminal instance here, but that requires a lot of refactoring
     * in most cases, at least one instance will be available for running commands
     */
    const lastTerminalInstance = this.#shells.at(this.#shells.length - 1);

    if (!lastTerminalInstance) {
      unreachable('No available shell terminal found');
    }

    return lastTerminalInstance;
  }

  async #executeAction(actionId: string, isStreaming: boolean = false) {
    const action = this.actions.get()[actionId];

    this.#updateAction(actionId, { status: 'running' });

    try {
      switch (action.type) {
        case 'shell': {
          void this.#runShellAction(action);
          break;
        }
        case 'file': {
          await this.#runFileAction(action);
          break;
        }
        case 'build': {
          // Store build output for deployment
          this.buildOutput = await this.#runBuildAction(action);
          break;
        }
        case 'start': {
          this.#runStartAction(action).catch((err: Error) => {
            if (action.abortSignal.aborted) {
              return;
            }

            this.#updateAction(actionId, { status: 'failed', error: 'Action failed' });
            logger.error(`[${action.type}]:Action failed\n\n`, err);

            if (!(err instanceof ActionCommandError)) {
              return;
            }

            this.onAlert?.({
              type: 'error',
              title: 'Dev Server Failed',
              description: err.header,
              content: err.output,
            });
          });

          this.#updateAction(actionId, { status: 'complete' });

          /*
           * adding a delay to avoid any race condition between 2 start actions
           * i am up for a better approach
           */
          await new Promise((resolve) => setTimeout(resolve, 2000));

          return;
        }
      }

      this.#updateAction(actionId, {
        status: isStreaming ? 'running' : action.abortSignal.aborted ? 'aborted' : 'complete',
      });
    } catch (error) {
      if (action.abortSignal.aborted) {
        return;
      }

      this.#updateAction(actionId, { status: 'failed', error: 'Action failed' });
      logger.error(`[${action.type}]:Action failed\n\n`, error);

      if (!(error instanceof ActionCommandError)) {
        return;
      }

      this.onAlert?.({
        type: 'error',
        title: 'Dev Server Failed',
        description: error.header,
        content: error.output,
      });

      // re-throw the error to be caught in the promise chain
      throw error;
    }
  }

  async #killRunningAppProcess(shell: LiblabShell): Promise<boolean> {
    try {
      const pid = await ActionRunner.getRunningAppPid();

      if (pid === null) {
        logger.debug('No PID to kill');
        return false;
      }

      logger.debug(`Killing PID (${pid})`);

      const webcontainer = await webcontainerPromise();
      await webcontainer.spawn('kill', [pid.toString()]);

      shell.executionState.set({
        ...shell.executionState.get(),
        active: false,
        executionPrms: Promise.resolve(),
      });
      logger.debug(`Killed process with PID: ${pid}`);

      return true;
    } catch (error) {
      logger.error('Error killing process:', error);
      return false;
    }
  }

  async #runShellAction(action: ActionState) {
    if (action.type !== 'shell') {
      unreachable('Expected shell action');
    }

    const shell = await this.#availableShellTerminal();

    const killedProcess = await this.#killRunningAppProcess(shell);

    if (killedProcess) {
      workbenchStore.previewsStore.preparingEnvironment();
    }

    await shell.ready();

    if (!shell || !shell.terminal || !shell.process) {
      unreachable('Shell terminal not found');
    }

    logger.debug(`[${action.type}]:Executing Action: ${action.content}\n\n`);

    try {
      const result = await shell.executeCommand(action.content, () => {
        logger.debug(`[${action.type}]:Aborting Action\n\n`, action);
        action.abort();
      });

      await workbenchStore.syncPackageJsonFile();

      if (result?.exitCode != 0) {
        logger.error(`Shell command failed: ${result?.output || 'No Output Available'}`);
        return;
      }
    } catch (error) {
      logger.error(`[${action.type}]:Error Executing Action: ${action.content}\n\n`, error);
    }
  }

  async #runStartAction(action: ActionState) {
    if (action.type !== 'start') {
      unreachable('Expected shell action');
    }

    const shell = await this.#availableShellTerminal();
    await shell.ready();

    if (!shell || !shell.terminal || !shell.process) {
      unreachable('Shell terminal not found');
    }

    const resp = await shell.executeCommand(action.content, () => {
      logger.debug(`[${action.type}]:Aborting Action\n\n`, action);
      action.abort();
    });
    logger.debug(`${action.type} Shell Response: [exit code:${resp?.exitCode}]`);

    if (resp?.exitCode != 0) {
      throw new ActionCommandError('Failed To Start Application', resp?.output || 'No Output Available');
    }

    return resp;
  }

  async #runFileAction(action: ActionState) {
    if (action.type !== 'file') {
      unreachable('Expected file action');
    }

    const webcontainer = await webcontainerPromise();
    const relativePath = nodePath.relative(webcontainer.workdir, action.filePath);

    let folder = nodePath.dirname(relativePath);

    // remove trailing slashes
    folder = folder.replace(/\/+$/g, '');

    if (folder !== '.') {
      try {
        await webcontainer.fs.mkdir(folder, { recursive: true });
        logger.debug('Created folder', folder);
      } catch (error) {
        logger.error('Failed to create folder\n\n', error);
      }
    }

    try {
      let content = action.content;

      if (relativePath.endsWith('.env')) {
        if (process.env.NEXT_PUBLIC_ENV_NAME === 'local') {
          const tunnelUrl = await getBaseUrl();
          content = injectEnvVariable(content, 'VITE_API_BASE_URL', tunnelUrl ? tunnelUrl : undefined);
        } else {
          content = injectEnvVariable(content, 'VITE_API_BASE_URL', process.env.BASE_URL);
        }
      }

      await webcontainer.fs.writeFile(relativePath, content);
      logger.debug(`File written ${relativePath}`);
    } catch (error) {
      logger.error('Failed to write file\n\n', error);
    }
  }

  #updateAction(id: string, newState: ActionStateUpdate) {
    const actions = this.actions.get();

    this.actions.setKey(id, { ...actions[id], ...newState });
  }

  #getHistoryPath(filePath: string) {
    return nodePath.join('.history', filePath);
  }

  async #runBuildAction(action: ActionState) {
    if (action.type !== 'build') {
      unreachable('Expected build action');
    }

    const webcontainer = await webcontainerPromise();

    // Create a new terminal specifically for the build
    const buildProcess = await webcontainer.spawn('pnpm', ['run', 'build']);

    let output = '';
    buildProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          output += data;
        },
      }),
    );

    const exitCode = await buildProcess.exit;

    if (exitCode !== 0) {
      throw new ActionCommandError('Build Failed', output || 'No Output Available');
    }

    // Get the build output directory path
    const buildDir = nodePath.join(webcontainer.workdir, 'build');

    return {
      path: buildDir,
      exitCode,
      output,
    };
  }
}
