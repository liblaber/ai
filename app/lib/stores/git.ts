import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { chatId, getLocalStorage } from '~/lib/persistence';
import { Octokit } from '@octokit/rest';
import { type MutableRefObject, useEffect } from 'react';
import { mapRemoteChangesToArtifact } from '~/utils/artifactMapper';
import { type Message, useChat } from '@ai-sdk/react';
import { workbenchStore } from '~/lib/stores/workbench';

interface GitMetadata {
  gitUrl: string;
  commitHistory: string[];
  gitBranch: string;
}

interface GitCredentials {
  owner: string;
  token: string;
}

interface GitState {
  gitMetadataByChatId: Record<string, GitMetadata>;
  setGitMetadata: (chatId: string, metadata: GitMetadata) => void;
  getGitMetadata: (chatId: string) => GitMetadata | null;
  clearGitMetadata: (chatId: string) => void;
  updateCommitHistory: (chatId: string, hash: string) => void;
  getCredentials: () => GitCredentials | null;
}

export const useGitStore = create<GitState>()(
  persist(
    (set, get) => ({
      gitMetadataByChatId: {},
      setGitMetadata: (chatId: string, metadata: GitMetadata) =>
        set((state) => ({
          gitMetadataByChatId: {
            ...state.gitMetadataByChatId,
            [chatId]: metadata,
          },
        })),
      getGitMetadata: (chatId: string) => get().gitMetadataByChatId[chatId] || null,
      clearGitMetadata: (chatId: string) =>
        set((state) => {
          const { [chatId]: _, ...rest } = state.gitMetadataByChatId;
          return { gitMetadataByChatId: rest };
        }),
      updateCommitHistory: (chatId: string, hash: string) =>
        set((state) => {
          const existingMetadata = state.gitMetadataByChatId[chatId];

          if (!existingMetadata) {
            return state;
          }

          return {
            gitMetadataByChatId: {
              ...state.gitMetadataByChatId,
              [chatId]: {
                ...existingMetadata,
                commitHistory: [...existingMetadata.commitHistory, hash],
              },
            },
          };
        }),
      getCredentials: () => {
        const githubConnection = getLocalStorage('github_connection');

        if (!githubConnection || !githubConnection.token || !githubConnection?.user?.login) {
          return null;
        }

        return {
          token: githubConnection.token,
          owner: githubConnection.user?.login,
        };
      },
    }),
    {
      name: 'git-metadata-storage',
    },
  ),
);

export const tempLog = console.log;

interface ChangedFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  content?: string;
}

export interface RemoteChanges {
  changed: ChangedFile[];
  removed: ChangedFile[];
  latestCommitHash: string;
}

export async function getRemoteChanges(): Promise<RemoteChanges | undefined> {
  const currentChatId = chatId.get();

  if (!currentChatId) {
    tempLog('Early return', { currentChatId });
    return undefined;
  }

  const storedMetadata = useGitStore.getState().getGitMetadata(currentChatId);
  tempLog('Checking latest commit', storedMetadata);

  if (!storedMetadata?.gitUrl) {
    return undefined;
  }

  try {
    const credentials = useGitStore.getState().getCredentials();

    if (!credentials) {
      return undefined;
    }

    const octokit = new Octokit({ auth: credentials.token });
    const repoName = storedMetadata.gitUrl.split('/').pop()?.replace('.git', '');

    if (!repoName) {
      tempLog('Early return', { repoName });
      return undefined;
    }

    const { data: ref } = await octokit.git.getRef({
      owner: credentials.owner,
      repo: repoName,
      ref: `heads/${storedMetadata.gitBranch}`,
    });

    const latestCommitHash = ref.object.sha;
    tempLog({ storedMetadata, latestCommitHash });

    const lastKnownCommit = storedMetadata.commitHistory.at(-1);

    if (lastKnownCommit && lastKnownCommit !== latestCommitHash) {
      // Get all commits since our last known commit
      const { data: commits } = await octokit.repos.listCommits({
        owner: credentials.owner,
        repo: repoName,
        per_page: 100, // Get up to 100 commits
      });

      // Get the commit details to show changed files
      const { data: commit } = await octokit.repos.getCommit({
        owner: credentials.owner,
        repo: repoName,
        ref: latestCommitHash,
      });

      // Check if this commit is already in our history
      if (storedMetadata.commitHistory.includes(latestCommitHash)) {
        tempLog('Commit already exists in history, skipping changes check');
        return undefined;
      }

      const removedFiles: ChangedFile[] = [];
      const changedFiles: ChangedFile[] = [];

      await Promise.all(
        (commit.files || []).map(async (file): Promise<void> => {
          const fileInfo = {
            filename: file.filename,
            status: file.status,
            additions: file.additions,
            deletions: file.deletions,
          };

          if (file.status === 'removed') {
            removedFiles.push(fileInfo);
            return;
          }

          let content: string | undefined;

          try {
            const { data: fileData } = await octokit.repos.getContent({
              owner: credentials.owner,
              repo: repoName,
              path: file.filename,
              ref: latestCommitHash,
            });

            if ('content' in fileData) {
              content = Buffer.from(fileData.content, 'base64').toString();
            }
          } catch (error) {
            console.error(`Error fetching content for ${file.filename}:`, error);
          }

          changedFiles.push({
            ...fileInfo,
            content,
          });
        }),
      );

      // Update the stored metadata with the latest commit history
      useGitStore.getState().setGitMetadata(currentChatId, {
        ...storedMetadata,
        commitHistory: commits.map((commit) => commit.sha),
      });

      return {
        changed: changedFiles,
        removed: removedFiles,
        latestCommitHash,
      };
    } else {
      return undefined;
    }
  } catch (error) {
    console.error(error);
    return undefined;
  }
}

interface UseGitPullSyncOptions {
  setMessages: ReturnType<typeof useChat>['setMessages'];
  messagesRef: MutableRefObject<Message[]>;
}

export function useGitPullSync({ setMessages, messagesRef }: UseGitPullSyncOptions): void {
  useEffect(() => {
    const interval = setInterval(async () => {
      const chatIdString = chatId.get();

      if (!chatIdString) {
        return;
      }

      const storedMetadata = useGitStore.getState().getGitMetadata(chatIdString);

      if (!storedMetadata) {
        return;
      }

      const remoteChanges = await getRemoteChanges();

      if (!remoteChanges) {
        tempLog('No files changed.');
        return;
      }

      const remotelyChangedFilesArtifact = mapRemoteChangesToArtifact(remoteChanges);

      if (!remotelyChangedFilesArtifact) {
        tempLog('No files changed.');
        return;
      }

      tempLog({ remotelyChangedFilesArtifact });

      setMessages([...messagesRef.current, remotelyChangedFilesArtifact]);

      // Update the stored metadata with the latest information
      useGitStore.getState().setGitMetadata(chatIdString, {
        ...storedMetadata,
        commitHistory: [...storedMetadata.commitHistory, remoteChanges.latestCommitHash],
      });

      // TODO @Lane save message to db
    }, 5000);

    return () => clearInterval(interval);
  }, []);
}

export async function pushToRemote(): Promise<void> {
  if (!chatId.get()) {
    return;
  }

  const storedMetadata = useGitStore.getState().getGitMetadata(chatId.get()!);
  const credentials = useGitStore.getState().getCredentials();

  if (!storedMetadata || !credentials) {
    return;
  }

  const repoName = storedMetadata.gitUrl
    .replace(/\.git$/, '')
    .split('/')
    .pop();

  if (!repoName) {
    return;
  }

  await workbenchStore.pushToGitHub(repoName, credentials.owner, credentials.token);
}
