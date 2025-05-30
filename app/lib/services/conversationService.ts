import { prisma } from '~/lib/prisma';
import type { Conversation } from '@prisma/client';

export const conversationService = {
  async getConversation(conversationId: string): Promise<Conversation | null> {
    return await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
  },

  async createConversation(): Promise<Conversation> {
    return await prisma.conversation.create({
      data: {},
    });
  },
};
