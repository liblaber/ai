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
  isDisconnected: boolean;
}

interface GitCredentials {
  owner: string;
  token: string;
}

interface GitState {
  gitMetadataByChatId: Record<string, GitMetadata>;
  remoteChangesPullIntervalSec: number;
  setGitMetadata: (chatId: string, metadata: GitMetadata) => void;
  getGitMetadata: (chatId: string) => GitMetadata | null;
  clearGitMetadata: (chatId: string) => void;
  updateCommitHistory: (chatId: string, hash: string) => void;
  getCredentials: () => GitCredentials | null;
  setRemoteChangesPullInterval: (interval: number) => void;
  disconnectRepository: (chatId: string) => void;
  reconnectRepository: (chatId: string) => void;
}

export const useGitStore = create<GitState>()(
  persist(
    (set, get) => ({
      gitMetadataByChatId: {},
      remoteChangesPullIntervalSec: 60,
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
      setRemoteChangesPullInterval: (interval: number) => set({ remoteChangesPullIntervalSec: interval }),
      disconnectRepository: (chatId: string) =>
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
                isDisconnected: true,
              },
            },
          };
        }),
      reconnectRepository: (chatId: string) =>
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
                isDisconnected: false,
              },
            },
          };
        }),
    }),
    {
      name: 'git-metadata-storage',
    },
  ),
);

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
    return undefined;
  }

  const storedMetadata = useGitStore.getState().getGitMetadata(currentChatId);

  if (!storedMetadata?.gitUrl || storedMetadata.isDisconnected) {
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
      return undefined;
    }

    const { data: ref } = await octokit.git.getRef({
      owner: credentials.owner,
      repo: repoName,
      ref: `heads/${storedMetadata.gitBranch}`,
    });

    const latestCommitHash = ref.object.sha;

    const lastKnownCommit = storedMetadata.commitHistory.at(-1);

    if (lastKnownCommit && lastKnownCommit !== latestCommitHash) {
      const { data: commits } = await octokit.repos.listCommits({
        owner: credentials.owner,
        repo: repoName,
        per_page: 100,
      });

      // Filter commits to only those after our last known commit
      const relevantCommits = commits.filter((commit) => !storedMetadata.commitHistory.includes(commit.sha));

      if (relevantCommits.length === 0) {
        return undefined;
      }

      const removedFiles: ChangedFile[] = [];
      const changedFiles: ChangedFile[] = [];
      const processedFiles = new Set<string>();

      // Process commits in chronological order (newest first)
      for (const commit of relevantCommits) {
        const { data: commitDetails } = await octokit.repos.getCommit({
          owner: credentials.owner,
          repo: repoName,
          ref: commit.sha,
        });

        await Promise.all(
          (commitDetails.files || []).map(async (file): Promise<void> => {
            // Skip if we've already processed this file in a newer commit
            if (processedFiles.has(file.filename)) {
              return;
            }

            processedFiles.add(file.filename);

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
                ref: commit.sha,
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
      }

      // Update the stored metadata with all new commit hashes
      useGitStore.getState().setGitMetadata(currentChatId, {
        ...storedMetadata,
        commitHistory: [...storedMetadata.commitHistory, ...relevantCommits.map((commit) => commit.sha)],
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

export function useGitPullSync({ setMessages, messagesRef }: UseGitPullSyncOptions) {
  const pullIntervalMs = useGitStore((state) => state.remoteChangesPullIntervalSec * 1000);

  const syncLatestChanges = async () => {
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
      return;
    }

    const remotelyChangedFilesArtifact = mapRemoteChangesToArtifact(remoteChanges);

    if (!remotelyChangedFilesArtifact) {
      return;
    }

    setMessages([...messagesRef.current, remotelyChangedFilesArtifact]);

    // Update the stored metadata with the latest information
    useGitStore.getState().setGitMetadata(chatIdString, {
      ...storedMetadata,
      commitHistory: [...storedMetadata.commitHistory, remoteChanges.latestCommitHash],
    });
  };

  useEffect(() => {
    const interval = setInterval(syncLatestChanges, pullIntervalMs); // Convert seconds to milliseconds

    return () => clearInterval(interval);
  }, [pullIntervalMs]);

  return {
    syncLatestChanges,
  };
}

export async function pushToRemote(): Promise<void> {
  if (!chatId.get()) {
    return;
  }

  const storedMetadata = useGitStore.getState().getGitMetadata(chatId.get()!);
  const credentials = useGitStore.getState().getCredentials();

  if (!storedMetadata || !credentials || storedMetadata.isDisconnected) {
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
