import type { Message } from '@ai-sdk/react';
import { getLatestSnapshotOrNull, type SnapshotResponse } from '~/lib/persistence/snapshots';
import { NO_EXECUTE_ACTION_ANNOTATION } from '~/lib/runtime/message-parser';
import { TelemetryEventType } from '~/lib/telemetry/telemetry-manager';
import { trackTelemetryEvent } from '~/lib/telemetry/telemetry-client';

const CONVERSATIONS_API = '/api/conversations';

type MessageResponse = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  finishReason?: string;
  createdAt: number;
  annotations: string[];
  snapshot?: {
    id: string;
  } | null;
};

type MessageRequest = Omit<MessageResponse, 'snapshot'>;

type ConversationResponse = {
  id: string;
  description?: string;
  messages: MessageResponse[];
  snapshots: {
    id: string;
  }[];
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
  snapshot: SnapshotResponse | null;
  messagesResponse: MessageResponse[];
};

export async function getConversation(id: string): Promise<UIConversation> {
  const response = await fetch(`${CONVERSATIONS_API}/${id}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch conversation: ${response.statusText}`);
  }

  const conversation: ConversationResponse = await response.json();

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  const messages: Message[] =
    conversation?.messages.map((message) => {
      const annotations = [...(message.annotations ?? []), NO_EXECUTE_ACTION_ANNOTATION];

      if (message.snapshot?.id) {
        annotations.push(`snapshotId:${message.snapshot.id}`);
      }

      return {
        id: message.id,
        role: message.role.toLowerCase() as Message['role'],
        content: message.content,
        createdAt: message.createdAt ? new Date(message.createdAt) : undefined,
        annotations,
      };
    }) ?? [];

  const snapshot: SnapshotResponse | null = await getLatestSnapshotOrNull(id);

  return {
    ...conversation,
    messages,
    snapshot,
    messagesResponse: conversation.messages,
  };
}

export async function createConversation(dataSourceId: string, messages?: MessageRequest[]): Promise<string> {
  const response = await fetch(CONVERSATIONS_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dataSourceId,
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create conversation: ${response.statusText}`);
  }

  const data = (await response.json()) as { id: string };

  return data.id;
}

export async function updateConversation(
  id: string,
  conversation: UpdateConversationRequest,
): Promise<ConversationResponse> {
  const response = await fetch(`${CONVERSATIONS_API}/${id}`, {
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
  const response = await fetch(CONVERSATIONS_API);

  if (!response.ok) {
    throw new Error(`Failed to fetch conversations: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteConversation(id: string): Promise<void> {
  const response = await fetch(`${CONVERSATIONS_API}/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete conversation: ${response.statusText}`);
  }
}

export async function forkConversation(conversationId: string, messageId: string): Promise<string> {
  const conversation = await getConversation(conversationId);

  if (!conversation) {
    throw new Error('Chat not found');
  }

  // Find the index of the message to fork at
  const messageIndex = conversation.messagesResponse.findIndex((message) => message.id === messageId);

  if (messageIndex === -1) {
    throw new Error('Message not found');
  }

  const messages = conversation.messagesResponse.slice(0, messageIndex + 1).map((message) => ({
    ...message,
    snapshot: undefined,
  }));

  const forkedConversationId = await createConversation(conversation.dataSourceId, messages);

  await trackTelemetryEvent({
    eventType: TelemetryEventType.USER_CHAT_FORK,
    properties: { conversationId, forkedConversationId },
  });

  return forkedConversationId;
}

export function getMessageSnapshotId(message: Message): string | null {
  const snapshotAnnotation = message.annotations?.find(
    (annotation) => typeof annotation === 'string' && annotation.startsWith('snapshotId:'),
  );

  if (!snapshotAnnotation || typeof snapshotAnnotation !== 'string') {
    return null;
  }

  return snapshotAnnotation.replace('snapshotId:', '');
}
