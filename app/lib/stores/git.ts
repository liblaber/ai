import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { chatId, getLocalStorage } from '~/lib/persistence';
import { Octokit } from '@octokit/rest';
import { toast } from 'sonner';
import { type MutableRefObject, useEffect } from 'react';
import { mapRemoteChangesToArtifact } from '~/utils/artifactMapper';
import { type Message, useChat } from '@ai-sdk/react';

interface GitMetadata {
  gitUrl: string;
  latestCommitHash: string;
  gitBranch: string;
}

interface GitCommitState {
  gitMetadataByChatId: Record<string, GitMetadata>;
  setGitMetadata: (chatId: string, metadata: GitMetadata) => void;
  getGitMetadata: (chatId: string) => GitMetadata | null;
  clearGitMetadata: (chatId: string) => void;
  updateLatestCommitHash: (chatId: string, hash: string) => void;
}

export const useGitCommitStore = create<GitCommitState>()(
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
      updateLatestCommitHash: (chatId: string, hash: string) =>
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
                latestCommitHash: hash,
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

  const storedMetadata = useGitCommitStore.getState().getGitMetadata(currentChatId);
  tempLog('Checking latest commit', storedMetadata);

  if (!storedMetadata?.gitUrl) {
    return undefined;
  }

  try {
    const githubConnection = getLocalStorage('github_connection');

    if (!githubConnection || !githubConnection.token || !githubConnection?.user?.login) {
      tempLog('Early return', { githubConnection });
      return undefined;
    }

    const {
      token,
      user: { login: owner },
    } = githubConnection;

    const octokit = new Octokit({ auth: token });
    const repoName = storedMetadata.gitUrl.split('/').pop()?.replace('.git', '');

    if (!repoName) {
      tempLog('Early return', { repoName });
      return undefined;
    }

    const { data: ref } = await octokit.git.getRef({
      owner,
      repo: repoName,
      ref: `heads/${storedMetadata.gitBranch}`,
    });

    const latestCommitHash = ref.object.sha;
    tempLog({ storedMetadata, latestCommitHash });

    if (storedMetadata.latestCommitHash && storedMetadata.latestCommitHash !== latestCommitHash) {
      // Get the commit details to show changed files
      const { data: commit } = await octokit.repos.getCommit({
        owner,
        repo: repoName,
        ref: latestCommitHash,
      });

      // Check if this is the initial commit (no parents)
      if (!commit.parents || commit.parents.length === 0) {
        tempLog('This is the initial commit, skipping changes check');
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
              owner,
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

      tempLog('Changed files', { changedFiles, removedFiles });

      if (changedFiles.length > 0 || removedFiles.length > 0) {
        const message = [
          'Repository has been updated with the following changes:',
          ...changedFiles.map((file) => `${file.filename} (${file.status}) +${file.additions} -${file.deletions}`),
          ...removedFiles.map((file) => `${file.filename} (${file.status}) +${file.additions} -${file.deletions}`),
        ].join('\n');

        toast.info(message);
      }

      return {
        changed: changedFiles,
        removed: removedFiles,
        latestCommitHash,
      };
    } else {
      tempLog('No changes in commit hashes...');
      return undefined;
    }
  } catch (error) {
    console.error('Error checking latest commit:', error);
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

      const storedMetadata = useGitCommitStore.getState().getGitMetadata(chatIdString);

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
      useGitCommitStore.getState().setGitMetadata(chatIdString, {
        ...storedMetadata,
        latestCommitHash: remoteChanges.latestCommitHash,
      });

      // TODO @Lane save message to db
    }, 5000);

    return () => clearInterval(interval);
  }, []);
}
