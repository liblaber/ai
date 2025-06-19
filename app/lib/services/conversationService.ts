import { prisma } from '~/lib/prisma';
import type { Conversation, Prisma } from '@prisma/client';

export const conversationService = {
  async getConversation(conversationId: string): Promise<Conversation | null> {
    return await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
  },

  async createConversation(
    dataSourceId: string,
    description?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Conversation> {
    return await (tx ?? prisma).conversation.create({
      data: {
        description,
        dataSource: {
          connect: { id: dataSourceId },
        },
      },
    });
  },

  async updateConversationDescription(
    conversationId: string,
    data: Partial<Conversation>,
  ): Promise<Conversation | null> {
    return await prisma.conversation.update({
      where: { id: conversationId },
      data,
    });
  },

  async getAllConversations(): Promise<Conversation[]> {
    return await prisma.conversation.findMany({
      select: {
        id: true,
        description: true,
        dataSourceId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },
};
