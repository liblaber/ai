import type { ChatHistoryItem } from '~/lib/persistence/useChatHistory';
import type { Message } from '@ai-sdk/react';
import { getLatestSnapshot, type SnapshotResponse } from '~/lib/persistence/snapshots';

export async function getConversation(id: string): Promise<ChatHistoryItem> {
  const response = await fetch(`/api/conversations/${id}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch conversation: ${response.statusText}`);
  }

  const data = (await response.json()) as any;
  const conversation = data.conversation;

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  // Map DB messages to Message type
  const messages: Message[] = (conversation.messages || []).map((msg: any) => {
    const roleString = msg.role?.toLowerCase();
    return {
      id: msg.id,
      role: roleString === 'agent' ? 'assistant' : (roleString ?? 'user'), // ensure lowercase for compatibility
      content: msg.content,
      createdAt: msg.createdAt ? new Date(msg.createdAt) : undefined,
    };
  });

  const snapshot: SnapshotResponse = await getLatestSnapshot(id);

  return {
    id: conversation.id,
    description: conversation.description || 'Create MILE',
    messages,
    timestamp: conversation.createdAt || conversation.updatedAt || new Date().toISOString(),
    metadata: conversation.dataSourceId ? { dataSourceId: conversation.dataSourceId } : undefined,
    snapshot,
  };
}
