'use client';
import { atom, map, type MapStore, type ReadableAtom, type WritableAtom } from 'nanostores';
import type { EditorDocument, ScrollPosition } from '~/components/editor/codemirror/CodeMirrorEditor';
import { ActionRunner } from '~/lib/runtime/action-runner';
import type { ActionCallbackData, ArtifactCallbackData } from '~/lib/runtime/message-parser';
import { webcontainer } from '~/lib/webcontainer';
import type { ITerminal } from '~/types/terminal';
import { unreachable } from '~/utils/unreachable';
import { EditorStore } from './editor';
import { type File, type FileMap, FilesStore } from './files';
import { type PreviewInfo, PreviewsStore } from './previews';
import { TerminalStore } from './terminal';
import JSZip from 'jszip';
import fileSaver from 'file-saver';
import { Octokit, type RestEndpointMethodTypes } from '@octokit/rest';
import { path } from '~/utils/path';
import { extractRelativePath, toAbsoluteFilePath } from '~/utils/diff';
import { chatId, description } from '~/lib/persistence';
import Cookies from 'js-cookie';
import { createSampler } from '~/utils/sampler';
import type { CodeError } from '~/types/actions';
import type { LiblabShell } from '~/utils/shell';
import { useGitStore } from './git';
import ignore from 'ignore';
import { logger } from '~/utils/logger';

const { saveAs } = fileSaver;

const DEFAULT_START_APP_COMMAND = 'npm run dev';

export interface ArtifactState {
  id: string;
  title: string;
  type?: string;
  closed: boolean;
  runner: ActionRunner;
}

export type ArtifactUpdateState = Pick<ArtifactState, 'title' | 'closed'>;

type Artifacts = MapStore<Record<string, ArtifactState>>;

export type WorkbenchViewType = 'code' | 'diff' | 'preview';

export class WorkbenchStore {
  artifacts: Artifacts = map({});
  devMode: WritableAtom<boolean> = atom(false);
  currentView: WritableAtom<WorkbenchViewType> = atom('preview');
  unsavedFiles: WritableAtom<Set<string>> = atom(new Set<string>());
  codeErrors: WritableAtom<CodeError[]> = atom<CodeError[]>([]);
  artifactIdList: string[] = [];
  startCommand = atom<string>(DEFAULT_START_APP_COMMAND);
  actionStreamSampler = createSampler(async (data: ActionCallbackData, isStreaming: boolean = false) => {
    return await this._runAction(data, isStreaming);
  }, 100);
  #previewsStore: PreviewsStore | null = null;
  #filesStore: FilesStore | null = null;
  #editorStore: EditorStore | null = null;
  #terminalStore = new TerminalStore();
  #reloadedMessages = new Set<string>();
  #mostRecentCommitMessage: string | undefined;
  #globalExecutionQueue = Promise.resolve();
  #initializationPromise: Promise<void> | null = null;

  get mostRecentCommitMessage() {
    return this.#mostRecentCommitMessage || 'liblab ai syncing files';
  }

  get previewsStore() {
    if (!this.#previewsStore) {
      throw new Error('WorkbenchStore not initialized. Call initialize() first.');
    }

    return this.#previewsStore;
  }

  get previews() {
    if (!this.#previewsStore) {
      return atom<PreviewInfo[]>([]);
    }

    return this.#previewsStore.previews;
  }

  get files() {
    if (!this.#filesStore) {
      return map<FileMap>({});
    }

    return this.#filesStore.files;
  }

  get currentDocument(): ReadableAtom<EditorDocument | undefined> {
    if (!this.#editorStore) {
      return atom<EditorDocument | undefined>(undefined);
    }

    return this.#editorStore.currentDocument;
  }

  get selectedFile(): ReadableAtom<string | undefined> {
    if (!this.#editorStore) {
      return atom<string | undefined>(undefined);
    }

    return this.#editorStore.selectedFile;
  }

  get firstArtifact(): ArtifactState | undefined {
    return this.#getArtifact(this.artifactIdList[0]);
  }

  get filesCount(): number {
    if (!this.#filesStore) {
      return 0;
    }

    return this.#filesStore.filesCount;
  }

  get showTerminal() {
    return this.#terminalStore.showTerminal;
  }

  get shells(): LiblabShell[] {
    return this.#terminalStore.getShells;
  }

  async initialize(): Promise<void> {
    if (this.#initializationPromise) {
      return this.#initializationPromise;
    }

    this.#initializationPromise = this.#initializeStores();

    return this.#initializationPromise;
  }

  setMostRecentCommitMessage(message: string) {
    this.#mostRecentCommitMessage = message;
  }

  addToExecutionQueue(callback: () => Promise<void>) {
    this.#globalExecutionQueue = this.#globalExecutionQueue.then(() => callback());
  }

  pushCodeError(error: CodeError) {
    const isAlreadyDetected = this.codeErrors.get().some((existingError) => (existingError.content = error.content));

    if (isAlreadyDetected) {
      return;
    }

    this.codeErrors.set([...this.codeErrors.get(), error]);
  }

  clearCodeErrors() {
    this.codeErrors.set([]);
  }

  getFixErrorsMessageText(errors: CodeError[] = this.codeErrors.get()): string {
    if (!errors.length) {
      logger.warn('Could not format fix errors message, codeErrors is empty');
      return '';
    }

    return `*Fix detected errors*:\n\n${errors
      .map((error) => `<pre><code>${error.content}</code></pre>`)
      .join('\n\n')}`;
  }

  toggleTerminal(value?: boolean) {
    this.#terminalStore.toggleTerminal(value);
  }

  openTerminal() {
    this.#terminalStore.showTerminal.set(true);
  }

  async attachTerminal(terminal: ITerminal) {
    await this.#terminalStore.attachTerminal(terminal);
  }

  onTerminalResize(cols: number, rows: number) {
    this.#terminalStore.onTerminalResize(cols, rows);
  }

  setDocuments(files: FileMap) {
    this.#editorStore?.setDocuments(files);
  }

  /**
   * Get the file map from the workbench, without the workdir prefix
   * @returns The file map
   */
  getFileMap(): FileMap {
    if (!this.#filesStore) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(this.#filesStore.files.get())
        .filter(([path]) => !path.includes('.next'))
        .map(([path, dirent]) => [extractRelativePath(path), dirent]),
    );
  }

  async syncPackageJsonFile(): Promise<File> {
    if (!this.#filesStore) {
      throw new Error('FilesStore not initialized');
    }

    return this.#filesStore.syncPackageJsonFile();
  }

  setCurrentDocumentContent(newContent: string) {
    if (!this.#filesStore || !this.#editorStore) {
      return;
    }

    const filePath = this.currentDocument.get()?.filePath;

    if (!filePath) {
      return;
    }

    const originalContent = this.#filesStore.getFile(filePath)?.content;
    const unsavedChanges = originalContent !== undefined && originalContent !== newContent;

    this.#editorStore.updateFile(filePath, newContent);

    const currentDocument = this.currentDocument.get();

    if (currentDocument) {
      const previousUnsavedFiles = this.unsavedFiles.get();

      if (unsavedChanges && previousUnsavedFiles.has(currentDocument.filePath)) {
        return;
      }

      const newUnsavedFiles = new Set(previousUnsavedFiles);

      if (unsavedChanges) {
        newUnsavedFiles.add(currentDocument.filePath);
      } else {
        newUnsavedFiles.delete(currentDocument.filePath);
      }

      this.unsavedFiles.set(newUnsavedFiles);
    }
  }

  setCurrentDocumentScrollPosition(position: ScrollPosition) {
    const editorDocument = this.currentDocument.get();

    if (!editorDocument) {
      return;
    }

    const { filePath } = editorDocument;

    this.#editorStore?.updateScrollPosition(filePath, position);
  }

  setSelectedFile(filePath: string | undefined) {
    this.#editorStore?.setSelectedFile(filePath);
  }

  async saveFile(filePath: string) {
    const documents = this.#editorStore?.documents.get();
    const document = documents![filePath];

    if (document === undefined) {
      return;
    }

    await this.#filesStore?.saveFile(filePath, document.value);

    const newUnsavedFiles = new Set(this.unsavedFiles.get());
    newUnsavedFiles.delete(filePath);

    this.unsavedFiles.set(newUnsavedFiles);
  }

  async saveCurrentDocument() {
    const currentDocument = this.currentDocument.get();

    if (currentDocument === undefined) {
      return;
    }

    await this.saveFile(currentDocument.filePath);
  }

  resetCurrentDocument() {
    const currentDocument = this.currentDocument.get();

    if (currentDocument === undefined) {
      return;
    }

    const { filePath } = currentDocument;
    const file = this.#filesStore?.getFile(filePath);

    if (!file) {
      return;
    }

    this.setCurrentDocumentContent(file.content);
  }

  async saveAllFiles() {
    for (const filePath of this.unsavedFiles.get()) {
      await this.saveFile(filePath);
    }
  }

  getFileModifications() {
    return this.#filesStore?.getFileModifications();
  }

  getModifiedFiles() {
    return this.#filesStore?.getModifiedFiles();
  }

  resetAllFileModifications() {
    this.#filesStore?.resetFileModifications();
  }

  setReloadedMessages(messages: string[]) {
    this.#reloadedMessages = new Set(messages);
  }

  addArtifact({ messageId, title, id, type }: ArtifactCallbackData) {
    const artifact = this.#getArtifact(messageId);

    if (artifact) {
      return;
    }

    if (!this.artifactIdList.includes(messageId)) {
      this.artifactIdList.push(messageId);
    }

    this.artifacts.setKey(messageId, {
      id,
      title,
      closed: false,
      type,
      runner: new ActionRunner(
        () => this.shells,
        (codeError) => {
          if (this.#reloadedMessages.has(messageId)) {
            return;
          }

          this.pushCodeError(codeError);
        },
      ),
    });
  }

  updateArtifact({ messageId }: ArtifactCallbackData, state: Partial<ArtifactUpdateState>) {
    const artifact = this.#getArtifact(messageId);

    if (!artifact) {
      return;
    }

    this.artifacts.setKey(messageId, { ...artifact, ...state });
  }

  addAction(data: ActionCallbackData) {
    this.addToExecutionQueue(() => this._addAction(data));
  }

  async _addAction(data: ActionCallbackData) {
    const { messageId } = data;

    const artifact = this.#getArtifact(messageId);

    if (!artifact) {
      unreachable('Artifact not found');
    }

    return artifact.runner.addAction(data);
  }

  runAction(data: ActionCallbackData, isStreaming: boolean = false) {
    if (!data.shouldExecute) {
      return;
    }

    if (isStreaming) {
      this.actionStreamSampler(data, isStreaming);
    } else {
      this.addToExecutionQueue(() => this._runAction(data, isStreaming));
    }
  }

  async _runAction(data: ActionCallbackData, isStreaming: boolean = false) {
    const { messageId } = data;

    const artifact = this.#getArtifact(messageId);

    if (!artifact) {
      unreachable('Artifact not found');
    }

    const action = artifact.runner.actions.get()[data.actionId];

    if (!action || action.executed) {
      return;
    }

    if (data.action.type === 'file') {
      const wc = await webcontainer();
      const fullPath = path.join(wc.workdir, data.action.filePath);

      if (this.selectedFile.value !== fullPath) {
        this.setSelectedFile(fullPath);
      }

      if (this.currentView.value !== 'code' && this.devMode.value) {
        this.currentView.set('code');
      }

      const doc = this.#editorStore?.documents.get()[fullPath];

      if (!doc) {
        await artifact.runner.runAction(data, isStreaming);
      }

      this.#editorStore?.updateFile(fullPath, data.action.content);

      if (!isStreaming) {
        await artifact.runner.runAction(data);
        this.resetAllFileModifications();
      }
    } else {
      await artifact.runner.runAction(data);
    }
  }

  async downloadZip() {
    const zip = new JSZip();
    const files = this.files.get();

    // Get the project name from the description input, or use a default name
    const projectName = (description.value ?? 'project').toLocaleLowerCase().split(' ').join('_');

    // Generate a simple 6-character hash based on the current timestamp
    const timestampHash = Date.now().toString(36).slice(-6);
    const uniqueProjectName = `${projectName}_${timestampHash}`;

    for (const [filePath, dirent] of Object.entries(files)) {
      if (dirent?.type === 'file' && !dirent.isBinary) {
        const relativePath = extractRelativePath(filePath);

        // split the path into segments
        const pathSegments = relativePath.split('/');

        // if there's more than one segment, we need to create folders
        if (pathSegments.length > 1) {
          let currentFolder = zip;

          for (let i = 0; i < pathSegments.length - 1; i++) {
            currentFolder = currentFolder.folder(pathSegments[i])!;
          }
          currentFolder.file(pathSegments[pathSegments.length - 1], dirent.content);
        } else if (dirent?.type === 'file' && filePath === toAbsoluteFilePath('.env')) {
          const lines = dirent.content.split('\n').filter((line) => line.trim() !== '');
          const viteApiUrlIndex = lines.findIndex((line) => line.startsWith('VITE_API_BASE_URL='));

          if (viteApiUrlIndex !== -1) {
            lines[viteApiUrlIndex] = "VITE_API_BASE_URL='http://localhost:3000'";
          } else {
            lines.push("VITE_API_BASE_URL='http://localhost:3000'");
          }

          // Ensure QUERY_MODE is set to direct
          const queryModeIndex = lines.findIndex((line) => line.startsWith('QUERY_MODE='));

          if (queryModeIndex !== -1) {
            lines[queryModeIndex] = 'QUERY_MODE=direct';
          } else if (lines.length === 0 || !lines.some((line) => line.startsWith('QUERY_MODE='))) {
            // If QUERY_MODE is not set, add it
            lines.push('QUERY_MODE=direct');
          }

          zip.file(relativePath, lines.join('\n') + '\n');
        } else {
          // if there's only one segment, it's a file in the root
          zip.file(relativePath, dirent.content);
        }
      }
    }

    // Generate the zip file and save it
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${uniqueProjectName}.zip`);
  }

  async syncFiles(targetHandle: FileSystemDirectoryHandle) {
    const files = this.files.get();
    const syncedFiles = [];

    for (const [filePath, dirent] of Object.entries(files)) {
      if (dirent?.type === 'file' && !dirent.isBinary) {
        const relativePath = extractRelativePath(filePath);
        const pathSegments = relativePath.split('/');
        let currentHandle = targetHandle;

        for (let i = 0; i < pathSegments.length - 1; i++) {
          currentHandle = await currentHandle.getDirectoryHandle(pathSegments[i], { create: true });
        }

        // create or get the file
        const fileHandle = await currentHandle.getFileHandle(pathSegments[pathSegments.length - 1], {
          create: true,
        });

        // write the file content
        const writable = await fileHandle.createWritable();
        await writable.write(dirent.content);
        await writable.close();

        syncedFiles.push(relativePath);
      }
    }

    return syncedFiles;
  }

  async pushToGitHub(repoName: string, githubUsername?: string, ghToken?: string, isPrivate?: boolean) {
    try {
      // Use cookies if username and token are not provided
      const githubToken = ghToken || Cookies.get('githubToken');
      const owner = githubUsername || Cookies.get('githubUsername');

      if (!githubToken || !owner) {
        throw new Error('GitHub token or username is not set in cookies or provided.');
      }

      // Initialize Octokit with the auth token
      const octokit = new Octokit({ auth: githubToken });

      // Check if the repository already exists before creating it
      let repo: RestEndpointMethodTypes['repos']['get']['response']['data'];

      try {
        const resp = await octokit.repos.get({ owner, repo: repoName });
        repo = resp.data;
      } catch (error) {
        if (error instanceof Error && 'status' in error && error.status === 404) {
          // Repository doesn't exist, so create a new one
          const { data: newRepo } = await octokit.repos.createForAuthenticatedUser({
            name: repoName,
            private: isPrivate ?? false,
            auto_init: true,
          });
          repo = newRepo;
        } else {
          console.log('cannot create repo!');
          throw error; // Some other error occurred
        }
      }

      // Get all files
      const files = this.files.get();

      if (!files || Object.keys(files).length === 0) {
        throw new Error('No files found to push');
      }

      const gitignoreContent = this.#filesStore?.getFile(toAbsoluteFilePath('.gitignore'))?.content;
      const ignoredFiles = gitignoreContent?.split('\n') ?? [];

      const ig = ignore();

      if (ignoredFiles?.length) {
        ig.add(ignoredFiles);
      }

      // Create blobs for each file
      const blobs = await Promise.all(
        Object.entries(files).map(async ([filePath, dirent]) => {
          if (!(dirent?.type === 'file' && dirent.content)) {
            return null;
          }

          const relativePath = extractRelativePath(filePath);

          if (ig.ignores(relativePath)) {
            return null;
          }

          const { data: blob } = await octokit.git.createBlob({
            owner: repo.owner.login,
            repo: repo.name,
            content: Buffer.from(dirent.content).toString('base64'),
            encoding: 'base64',
          });

          return { path: relativePath, sha: blob.sha };
        }),
      );

      const validBlobs = blobs.filter(Boolean); // Filter out any undefined blobs

      if (validBlobs.length === 0) {
        throw new Error('No valid files to push');
      }

      // Get the latest commit SHA (assuming main branch, update dynamically if needed)
      const { data: ref } = await octokit.git.getRef({
        owner: repo.owner.login,
        repo: repo.name,
        ref: `heads/${repo.default_branch || 'main'}`, // Handle dynamic branch
      });
      const latestCommitSha = ref.object.sha;

      // Create a new tree
      const { data: newTree } = await octokit.git.createTree({
        owner: repo.owner.login,
        repo: repo.name,
        base_tree: latestCommitSha,
        tree: validBlobs.map((blob) => ({
          path: blob!.path,
          mode: '100644',
          type: 'blob',
          sha: blob!.sha,
        })),
      });

      const commitMessage = this.mostRecentCommitMessage;

      // Create a new commit
      const { data: newCommit } = await octokit.git.createCommit({
        owner: repo.owner.login,
        repo: repo.name,
        message: commitMessage || 'Initial commit from your app',
        tree: newTree.sha,
        parents: [latestCommitSha],
      });

      // Update the reference
      await octokit.git.updateRef({
        owner: repo.owner.login,
        repo: repo.name,
        ref: `heads/${repo.default_branch || 'main'}`, // Handle dynamic branch
        sha: newCommit.sha,
      });

      // Store the commit hash and metadata in the persistent store under the current chat ID
      const currentChatId = chatId.get();

      if (currentChatId) {
        // Get all commits for the repository
        const { data: commits } = await octokit.repos.listCommits({
          owner: repo.owner.login,
          repo: repo.name,
          per_page: 100, // Get up to 100 commits
        });

        const commitHistory = commits.map((commit) => commit.sha);

        if (!commitHistory.includes(newCommit.sha)) {
          commitHistory.push(newCommit.sha);
        }

        useGitStore.getState().setGitMetadata(currentChatId, {
          gitUrl: repo.html_url,
          commitHistory,
          gitBranch: repo.default_branch || 'main',
          isDisconnected: false,
        });
      }
    } catch (error) {
      console.error('Error pushing to GitHub:', error);
      throw error; // Rethrow the error for further handling
    }
  }

  async #initializeStores(): Promise<void> {
    const webcontainerInstance = await webcontainer();
    this.#previewsStore = new PreviewsStore(Promise.resolve(webcontainerInstance));
    this.#filesStore = new FilesStore(Promise.resolve(webcontainerInstance));
    this.#editorStore = new EditorStore(this.#filesStore);
  }

  #getArtifact(id: string) {
    const artifacts = this.artifacts.get();
    return artifacts[id];
  }
}

export const workbenchStore = new WorkbenchStore();
