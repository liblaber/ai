import { useLoaderData, useNavigate, useSearchParams } from '@remix-run/react';
import { useCallback, useEffect, useState } from 'react';
import { atom } from 'nanostores';
import { generateId, type JSONValue, type Message } from 'ai';
import { toast } from 'sonner';
import { workbenchStore } from '~/lib/stores/workbench';
import {
  createChatFromMessages,
  duplicateChat,
  getChatMetadata,
  getMessages,
  getNextId,
  type IChatMetadata,
  openDatabase,
  setMessages,
} from './db';
import { type FileMap } from '~/lib/stores/files';
import type { Snapshot } from './types';
import { webcontainer } from '~/lib/webcontainer';
import { createCommandsMessage, detectProjectCommands } from '~/utils/projectCommands';
import type { ContextAnnotation } from '~/types/context';
import { injectEnvVariable } from '~/utils/envUtils';
import { useDataSourcesStore } from '~/lib/stores/dataSources';

export interface ChatHistoryItem {
  id: string;
  description?: string;
  messages: Message[];
  timestamp: string;
  metadata?: IChatMetadata;
}

const persistenceEnabled = !import.meta.env.VITE_DISABLE_PERSISTENCE;

export const db = persistenceEnabled ? await openDatabase() : undefined;

export const chatId = atom<string | undefined>(undefined);
export const description = atom<string | undefined>(undefined);
export const chatMetadata = atom<IChatMetadata | undefined>(undefined);
export function useChatHistory() {
  const navigate = useNavigate();
  const idParam = useLoaderData<{ id?: string }>();
  const id = idParam?.id;
  const [searchParams] = useSearchParams();
  const { selectedDataSourceId, setSelectedDataSourceId } = useDataSourcesStore();

  const [archivedMessages, setArchivedMessages] = useState<Message[]>([]);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [ready, setReady] = useState<boolean>(false);

  useEffect(() => {
    if (!db) {
      setReady(true);

      if (persistenceEnabled) {
        toast.error('Chat persistence is unavailable');
      }

      return;
    }

    if (id) {
      getMessages(db, id)
        .then(async (chatHistory) => {
          if (chatHistory && chatHistory.messages.length > 0) {
            const snapshotKeys = Object.keys(localStorage).filter((key) => key.startsWith('snapshot:'));
            const snapshotKey = snapshotKeys.find((key) => {
              const parts = key.split(':');
              return parts[1] === id && parts[2] !== undefined;
            });

            const snapshotStr = snapshotKey ? localStorage.getItem(snapshotKey) : null;
            const snapshot: Snapshot = snapshotStr ? JSON.parse(snapshotStr) : { chatIndex: 0, files: {} };
            const summary = snapshot.summary;

            const rewindId = searchParams.get('rewindTo');
            let startingIdx = -1;
            const endingIdx = rewindId
              ? chatHistory.messages.findIndex((m) => m.id === rewindId) + 1
              : chatHistory.messages.length;
            const snapshotIndex = chatHistory.messages.findIndex((m) => m.id === snapshot.chatIndex);

            if (snapshotIndex >= 0 && snapshotIndex < endingIdx) {
              startingIdx = snapshotIndex;
            }

            if (snapshotIndex > 0 && chatHistory.messages[snapshotIndex].id == rewindId) {
              startingIdx = -1;
            }

            let filteredMessages = chatHistory.messages.slice(startingIdx + 1, endingIdx);
            let archivedMessages: Message[] = [];

            if (startingIdx >= 0) {
              archivedMessages = chatHistory.messages.slice(0, startingIdx + 1);
            }

            setArchivedMessages(archivedMessages);

            if (startingIdx > 0) {
              const files = Object.entries(snapshot?.files || {})
                .map(([key, value]) => {
                  if (value?.type !== 'file') {
                    return null;
                  }

                  return {
                    content: value.content,
                    path: key,
                  };
                })
                .filter((x) => !!x);
              const projectCommands = await detectProjectCommands(files);
              const commands = createCommandsMessage(projectCommands);

              filteredMessages = [
                {
                  id: generateId(),
                  role: 'user',
                  content: `Restore project from snapshot
                  `,
                  annotations: ['no-store', 'hidden'],
                },
                {
                  id: chatHistory.messages[snapshotIndex].id,
                  role: 'assistant',
                  content: `We restored your chat from the snapshot. You can continue with your request or you can load the full chat history.
                  <liblabArtifact id="imported-files" title="Project Files Snapshot" type="bundled">
                  ${Object.entries(snapshot?.files || {})
                    .filter((x) => !x[0].endsWith('lock.json'))
                    .map(([key, value]) => {
                      if (value?.type === 'file') {
                        return `
                      <liblabAction type="file" filePath="${key}">
${value.content}
                      </liblabAction>
                      `;
                      } else {
                        return ``;
                      }
                    })
                    .join('\n')}
                  </liblabArtifact>
                  `,
                  annotations: [
                    'no-store',
                    ...(summary
                      ? [
                          {
                            chatId: chatHistory.messages[snapshotIndex].id,
                            type: 'chatSummary',
                            summary,
                          } satisfies ContextAnnotation,
                        ]
                      : []),
                  ],
                },
                ...(commands !== null
                  ? [
                      {
                        id: `${chatHistory.messages[snapshotIndex].id}-2`,
                        role: 'user' as const,
                        content: `setup project`,
                        annotations: ['no-store', 'hidden'],
                      },
                      {
                        ...commands,
                        id: `${chatHistory.messages[snapshotIndex].id}-3`,
                        annotations: [
                          'no-store',
                          ...(commands.annotations || []),
                          ...(summary
                            ? [
                                {
                                  chatId: `${chatHistory.messages[snapshotIndex].id}-3`,
                                  type: 'chatSummary',
                                  summary,
                                } satisfies ContextAnnotation,
                              ]
                            : []),
                        ],
                      },
                    ]
                  : []),
                ...filteredMessages,
              ];

              if (snapshotKey) {
                await restoreSnapshot(snapshotKey);
              }
            }

            setInitialMessages(filteredMessages);

            const existingDataSourceId = chatHistory?.metadata?.dataSourceId;

            if (existingDataSourceId) {
              setSelectedDataSourceId(existingDataSourceId);
            }

            description.set(chatHistory.description);
            chatId.set(chatHistory.id);
            chatMetadata.set(chatHistory.metadata);
          } else {
            navigate('/', { replace: true });
          }

          setReady(true);
        })
        .catch((error) => {
          console.error(error);
          toast.error(error.message);
        });
    }
  }, [id]);

  const takeSnapshot = useCallback(
    async (chatIdx: string, files: FileMap, _chatId?: string | undefined, chatSummary?: string) => {
      const id = _chatId || chatId;

      if (!id) {
        return;
      }

      const snapshotKeys = Object.keys(localStorage).filter((key) => key.startsWith('snapshot:'));

      const existingSnapshotKey =
        snapshotKeys.find((key) => {
          const parts = key.split(':');
          return parts[1] === id;
        }) || '';

      let dataSourceId;
      const previousSnapshotString = localStorage.getItem(existingSnapshotKey);

      if (previousSnapshotString) {
        const previousSnapshot = JSON.parse(previousSnapshotString) as Snapshot;
        dataSourceId = previousSnapshot?.dataSourceId;
      } else {
        dataSourceId = selectedDataSourceId;
      }

      const snapshotKey = existingSnapshotKey || `snapshot:${id}:${Date.now()}`;
      const snapshot: Snapshot = {
        chatIndex: chatIdx,
        files,
        summary: chatSummary,
        dataSourceId,
      };

      try {
        localStorage.setItem(snapshotKey, JSON.stringify(snapshot));
      } catch (error) {
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          const snapshotKeys = Object.keys(localStorage).filter((key) => key.startsWith('snapshot:'));

          if (snapshotKeys.length > 0) {
            // Filter and sort snapshots by timestamp
            const validSnapshots = snapshotKeys
              .map((key) => {
                const parts = key.split(':');
                const timestamp = parts[2] ? parseInt(parts[2]) : null;

                return { key, timestamp };
              })
              .filter(({ timestamp }) => timestamp !== null)
              .sort((a, b) => b.timestamp! - a.timestamp!);

            // Keep only the 3 most recent snapshots
            const snapshotsToDelete = [
              ...validSnapshots.slice(3).map((s) => s.key),
              ...snapshotKeys.filter((key) => !key.includes(':') || !key.split(':')[2]),
            ];

            // Remove all snapshots except the 3 most recent valid ones
            for (const key of snapshotsToDelete) {
              localStorage.removeItem(key);
            }

            // Retry setting the snapshot
            try {
              localStorage.setItem(snapshotKey, JSON.stringify(snapshot));
            } catch (retryError) {
              console.error('Failed to store snapshot after cleanup:', retryError);
              toast.error('Failed to store chat snapshot');
            }
          }
        } else {
          console.error('Error storing snapshot:', error);
          toast.error('Failed to store chat snapshot');
        }
      }
    },
    [chatId],
  );

  const restoreSnapshot = useCallback(async (snapshotKey: string) => {
    const snapshotStr = localStorage.getItem(snapshotKey);
    const container = await webcontainer;

    const snapshot: Snapshot = snapshotStr ? JSON.parse(snapshotStr) : { chatIndex: 0, files: {} };

    if (snapshot.dataSourceId) {
      setSelectedDataSourceId(snapshot.dataSourceId);
    }

    if (!snapshot?.files) {
      return;
    }

    Object.entries(snapshot.files).forEach(async ([key, value]) => {
      if (key.startsWith(container.workdir)) {
        key = key.replace(container.workdir, '');
      }

      if (value?.type === 'folder') {
        await container.fs.mkdir(key, { recursive: true });
      }
    });
    Object.entries(snapshot.files).forEach(async ([key, value]) => {
      if (value?.type === 'file') {
        if (key.startsWith(container.workdir)) {
          key = key.replace(container.workdir, '');
        }

        if (key.endsWith('.env') && import.meta.env.VITE_ENV_NAME === 'local') {
          const tunnelForwardingUrl = import.meta.env.VITE_TUNNEL_FORWARDING_URL;
          value.content = injectEnvVariable(
            value.content,
            'VITE_API_BASE_URL',
            tunnelForwardingUrl ? tunnelForwardingUrl : undefined,
          );
        }

        await container.fs.writeFile(key, value.content, { encoding: value.isBinary ? undefined : 'utf8' });
      } else {
      }
    });
  }, []);

  return {
    ready: !id || ready,
    initialMessages,
    updateChatMetaData: async (metadata: IChatMetadata) => {
      const id = chatId.get();

      if (!db || !id) {
        return;
      }

      try {
        await setMessages(db, id, initialMessages, description.get(), undefined, metadata);
        chatMetadata.set(metadata);
      } catch (error) {
        toast.error('Failed to update chat metadata');
        console.error(error);
      }
    },
    storeMessageHistory: async (messages: Message[]) => {
      if (!db || messages.length === 0) {
        return;
      }

      const { firstArtifact } = workbenchStore;
      messages = messages.filter((m) => !m.annotations?.includes('no-store'));

      let chatSummary: string | undefined = undefined;
      const lastMessage = messages[messages.length - 1];

      if (lastMessage.role === 'assistant') {
        const annotations = lastMessage.annotations as JSONValue[];
        const filteredAnnotations = (annotations?.filter(
          (annotation: JSONValue) =>
            annotation && typeof annotation === 'object' && Object.keys(annotation).includes('type'),
        ) || []) as { type: string; value: any } & { [key: string]: any }[];

        if (filteredAnnotations.find((annotation) => annotation.type === 'chatSummary')) {
          chatSummary = filteredAnnotations.find((annotation) => annotation.type === 'chatSummary')?.summary;
        }
      }

      if (initialMessages.length === 0 && !chatId.get()) {
        const nextId = await getNextId();

        chatId.set(nextId);
        navigateChat(nextId);
      }

      await takeSnapshot(messages[messages.length - 1].id, workbenchStore.files.get(), chatId.get(), chatSummary);

      if (!description.get() && firstArtifact?.title) {
        description.set(firstArtifact?.title);
      }

      let dataSourceId;

      try {
        const existingChatMetadata = await getChatMetadata(db, chatId.get() as string);
        dataSourceId = existingChatMetadata?.dataSourceId || selectedDataSourceId;
      } catch {
        dataSourceId = selectedDataSourceId;
      }

      await setMessages(db, chatId.get() as string, [...archivedMessages, ...messages], description.get(), undefined, {
        ...chatMetadata.get(),
        dataSourceId,
      });
    },
    duplicateCurrentChat: async (listItemId: string) => {
      if (!db || (!id && !listItemId)) {
        return;
      }

      try {
        const newId = await duplicateChat(db, id || listItemId);
        navigate(`/chat/${newId}`);
        toast.success('Chat duplicated successfully');
      } catch (error) {
        toast.error('Failed to duplicate chat');
        console.log(error);
      }
    },
    importChat: async (description: string, messages: Message[], metadata?: IChatMetadata) => {
      if (!db) {
        return;
      }

      try {
        const newId = await createChatFromMessages(db, description, messages, metadata);
        window.location.href = `/chat/${newId}`;
        toast.success('Chat imported successfully');
      } catch (error) {
        if (error instanceof Error) {
          toast.error('Failed to import chat: ' + error.message);
        } else {
          toast.error('Failed to import chat');
        }
      }
    },
    exportChat: async (id = chatId.get()) => {
      if (!db || !id) {
        return;
      }

      const chat = await getMessages(db, id);
      const chatData = {
        messages: chat.messages,
        description: chat.description,
        exportDate: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  };
}

export function navigateChat(nextId: string) {
  /**
   * FIXME: Using the intended navigate function causes a rerender for <Chat /> that breaks the app.
   *
   * `navigate(`/chat/${nextId}`, { replace: true });`
   */
  const url = new URL(window.location.href);
  url.pathname = `/chat/${nextId}`;

  window.history.replaceState({}, '', url);
}
