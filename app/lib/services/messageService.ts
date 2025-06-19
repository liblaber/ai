import { prisma } from '~/lib/prisma';
import type { Message } from '@prisma/client';
import { MESSAGE_ROLE } from '~/types/database';

type SaveMessageModel = Partial<Message> & {
  conversationId: string;
  content: string;
  model: string;
};

export const messageService = {
  async saveMessage({
    conversationId,
    content,
    model,
    inputTokens = 0,
    outputTokens = 0,
    finishReason = '-',
    role = MESSAGE_ROLE.USER,
    id,
    annotations,
  }: SaveMessageModel): Promise<Message> {
    return await prisma.message.create({
      data: {
        id,
        conversationId,
        content,
        model,
        inputTokens,
        outputTokens,
        finishReason,
        role,

        // fallback needed because of Prisma TS issue (null not allowed)
        annotations: annotations || undefined,
      },
    });
  },
};
