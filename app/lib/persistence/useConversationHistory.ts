'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { atom } from 'nanostores';
import { type Message } from 'ai';
import { toast } from 'sonner';
import { useEnvironmentDataSourcesStore } from '~/lib/stores/environmentDataSources';
import { saveSnapshot, type SnapshotResponse } from '~/lib/persistence/snapshots';
import { createCommandsMessage, detectProjectCommandsFromFileMap } from '~/utils/projectCommands';
import { loadFileMapIntoContainer } from '~/lib/webcontainer/load-file-map';
import { getConversation, updateConversation } from '~/lib/persistence/conversations';
import { pushToRemote } from '~/lib/stores/git';
import { workbenchStore } from '~/lib/stores/workbench';
import { logger } from '~/utils/logger';

export interface IChatMetadata {
  gitUrl?: string;
  gitBranch?: string;
  netlifySiteId?: string;
  dataSourceId?: string | null;
}

export interface ChatHistoryItem {
  id: string;
  description?: string;
  messages: Message[];
  timestamp: string;
  metadata?: IChatMetadata;
  snapshot?: SnapshotResponse;
}

export const chatId = atom<string | undefined>(undefined);
export const description = atom<string | undefined>(undefined);

export function useConversationHistory(id?: string) {
  const router = useRouter();
  const { selectedEnvironmentDataSource, setSelectedEnvironmentDataSource } = useEnvironmentDataSourcesStore();

  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [commandMessage, setCommandMessage] = useState<Message>();
  const [ready, setReady] = useState<boolean>(false);

  const initializedId = useRef<string>();

  useEffect(() => {
    if (!id || initializedId.current === id) {
      return;
    }

    initializedId.current = id;

    getConversation(id)
      .then(async (conversation) => {
        if (!conversation) {
          router.replace('/');
          return;
        }

        setInitialMessages(conversation.messages || []);

        const snapshot = conversation?.snapshot;

        if (!snapshot) {
          setReady(true);
          return;
        }

        loadFileMapIntoContainer(snapshot.fileMap)
          .then(async () => {
            logger.debug('Snapshot loaded successfully');

            const projectCommands = await detectProjectCommandsFromFileMap(snapshot.fileMap);

            if (projectCommands) {
              setCommandMessage(createCommandsMessage(projectCommands));
            }
          })
          .catch((reason) => {
            toast.error('Failed to load snapshot into container');
            logger.error('Failed to load snapshot into container', reason);
          });

        if (conversation.dataSourceId && conversation.dataSourceId !== selectedEnvironmentDataSource.dataSourceId) {
          setSelectedEnvironmentDataSource(conversation.dataSourceId, conversation.environmentId);
        }

        chatId.set(conversation.id);
        description.set(conversation.description);

        setReady(true);
      })
      .catch((error) => {
        console.error(error);
        toast.error(error.message);

        // Redirect to main chat page if conversation not found
        router.replace('/chat');
      });
  }, [id, router, selectedEnvironmentDataSource, setSelectedEnvironmentDataSource]);

  return {
    ready: !id || ready,
    initialMessages,
    commandMessage,
    setCommandMessage,
    storeConversationHistory: async (
      lastMessageId: string,
      onSnapshotCreated?: (snapshotId: string, messageId: string) => void,
      artifactTitle?: string,
    ) => {
      const conversationId = chatId.get();

      if (!conversationId) {
        return;
      }

      const snapshotResult = await saveSnapshot(conversationId, lastMessageId);

      if (onSnapshotCreated && snapshotResult?.id) {
        onSnapshotCreated(snapshotResult.id, lastMessageId);
      }

      const firstArtifact = workbenchStore.firstArtifact;

      if (!description.get()) {
        const descriptionToUpdate = artifactTitle || firstArtifact?.title;

        if (descriptionToUpdate) {
          await updateConversation(conversationId, {
            description: descriptionToUpdate,
          });
          description.set(descriptionToUpdate);
        }
      }

      await pushToRemote();
    },
    exportChat: async (id = chatId.get()) => {
      if (!id) {
        return;
      }

      const chat = await getConversation(id);

      const blob = new Blob([JSON.stringify(chat, null, 2)], { type: 'application/json' });
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

export function updateNavigationChat(nextId: string | undefined) {
  if (nextId && window.location.pathname === '/chat') {
    const newPath = `/chat/${nextId}`;
    window.history.replaceState(null, '', newPath);
  }
}
