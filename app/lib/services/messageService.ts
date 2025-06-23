import { prisma } from '~/lib/prisma';
import type { Message, Prisma } from '@prisma/client';
import { MESSAGE_ROLE } from '~/types/database';

type SaveMessageModel = {
  conversationId: string;
  content: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  finishReason?: string;
  role?: string;
  id?: string;
  annotations?: Prisma.JsonValue;
};

export const messageService = {
  async saveMessage(
    {
      conversationId,
      content,
      model,
      inputTokens = 0,
      outputTokens = 0,
      finishReason = '-',
      role = MESSAGE_ROLE.USER,
      id,
      annotations,
    }: SaveMessageModel,
    tx?: Prisma.TransactionClient,
  ): Promise<Message> {
    return await (tx ?? prisma).message.create({
      data: {
        id,
        conversationId,
        content,
        model,
        inputTokens,
        outputTokens,
        finishReason,
        role,

        // needed because of the prisma TS issue (not accepting null)
        annotations: annotations ?? undefined,
      },
    });
  },

  async saveMessages(messages: SaveMessageModel[], tx?: Prisma.TransactionClient) {
    return await (tx ?? prisma).message.createMany({
      data: messages.map((message) => ({
        ...message,
        inputTokens: message.inputTokens ?? 0,
        outputTokens: message.outputTokens ?? 0,
        finishReason: message.finishReason ?? '-',

        // needed because of the prisma TS issue (not accepting null)
        annotations: message.annotations ?? undefined,
      })),
    });
  },
};
