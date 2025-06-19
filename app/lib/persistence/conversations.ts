import type { Message } from '@ai-sdk/react';
import { getLatestSnapshot, type SnapshotResponse } from '~/lib/persistence/snapshots';
import { NO_EXECUTE_ACTION_ANNOTATION } from '~/lib/runtime/message-parser';
import { tempLog } from '~/root';

type MessageResponse = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  annotations: string[];
};

type ConversationResponse = {
  id: string;
  description?: string;
  messages: MessageResponse[];
  createdAt: number;
  updatedAt: number;
  dataSourceId: string;
};

export type SimpleConversationResponse = Omit<ConversationResponse, 'messages'>;

export type UpdateConversationRequest = {
  description?: string;
};

type UIConversation = Omit<ConversationResponse, 'messages'> & {
  messages: Message[];
  snapshot: SnapshotResponse;
};

export async function getConversation(id: string): Promise<UIConversation> {
  const response = await fetch(`/api/conversations/${id}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch conversation: ${response.statusText}`);
  }

  const conversation: ConversationResponse = await response.json();

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  const messages: Message[] =
    conversation?.messages.map((message) => {
      tempLog(message.annotations);
      return {
        id: message.id,
        role: message.role.toLowerCase() as Message['role'],
        content: message.content,
        createdAt: message.createdAt ? new Date(message.createdAt) : undefined,
        annotations: [...(message.annotations ?? []), NO_EXECUTE_ACTION_ANNOTATION],
      };
    }) ?? [];

  const snapshot: SnapshotResponse = await getLatestSnapshot(id);

  return {
    ...conversation,
    messages,
    snapshot,
  };
}

export async function updateConversation(
  id: string,
  conversation: UpdateConversationRequest,
): Promise<ConversationResponse> {
  const response = await fetch(`/api/conversations/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(conversation),
  });

  if (!response.ok) {
    throw new Error(`Failed to update conversation: ${response.statusText}`);
  }

  return response.json();
}

export async function getConversations(): Promise<SimpleConversationResponse[]> {
  const response = await fetch('/api/conversations');

  if (!response.ok) {
    throw new Error(`Failed to fetch conversations: ${response.statusText}`);
  }

  return response.json();
}
