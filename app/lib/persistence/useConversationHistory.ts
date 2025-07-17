import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { atom } from 'nanostores';
import { type Message } from 'ai';
import { toast } from 'sonner';
import { useDataSourcesStore } from '~/lib/stores/dataSources';
import { saveSnapshot, type SnapshotResponse } from '~/lib/persistence/snapshots';
import { createCommandsMessage, detectProjectCommands } from '~/utils/projectCommands';
import { loadFileMapIntoContainer } from '~/lib/webcontainer/load-file-map';
import { getConversation, updateConversation } from '~/lib/persistence/conversations';
import { pushToRemote } from '~/lib/stores/git';
import { workbenchStore } from '~/lib/stores/workbench';

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
  const { selectedDataSourceId, setSelectedDataSourceId } = useDataSourcesStore();

  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [commandMessage, setCommandMessage] = useState<Message>();
  const [ready, setReady] = useState<boolean>(false);

  useEffect(() => {
    if (!id) {
      return;
    }

    getConversation(id)
      .then(async (conversation) => {
        if (!(conversation && conversation.messages.length > 0)) {
          router.replace('/');
        }

        const snapshot = conversation?.snapshot;

        if (!snapshot) {
          toast.error('Failed to load chat history');
          return;
        }

        await loadFileMapIntoContainer(snapshot.fileMap);

        const projectCommands = await detectProjectCommands(snapshot.fileMap);
        const projectCommandsMessage = projectCommands ? createCommandsMessage(projectCommands) : null;

        if (projectCommandsMessage) {
          setCommandMessage(projectCommandsMessage);
        }

        setInitialMessages(conversation.messages);

        if (conversation.dataSourceId && conversation.dataSourceId !== selectedDataSourceId) {
          setSelectedDataSourceId(conversation.dataSourceId);
        }

        chatId.set(conversation.id);
        description.set(conversation.description);

        setReady(true);
      })
      .catch((error) => {
        console.error(error);
        toast.error(error.message);
      });
  }, [id, router, selectedDataSourceId, setSelectedDataSourceId]);

  return {
    ready: !id || ready,
    initialMessages,
    commandMessage,
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
