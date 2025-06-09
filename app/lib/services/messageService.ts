import { prisma } from '~/lib/prisma';
import type { Message } from '@prisma/client';
import { MessageRole } from '@prisma/client';

export const messageService = {
  async saveMessage(
    conversationId: string,
    content: string,
    model: string,
    inputTokens: number = 0,
    outputTokens: number = 0,
    finishReason: string = '-',
    role: MessageRole = MessageRole.USER,
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
