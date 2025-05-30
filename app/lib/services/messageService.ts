import { prisma } from '~/lib/prisma';
import type { Message } from '@prisma/client';
import { MESSAGE_ROLE, type MessageRole } from '~/types/database';

export const messageService = {
  async saveMessage(
    conversationId: string,
    content: string,
    model: string,
    inputTokens: number = 0,
    outputTokens: number = 0,
    finishReason: string = '-',
    role: MessageRole = MESSAGE_ROLE.USER,
  ): Promise<Message> {
    return await prisma.message.create({
      data: {
        conversationId,
        content,
        model,
        inputTokens,
        outputTokens,
        finishReason,
        role,
      },
    });
  },
};
