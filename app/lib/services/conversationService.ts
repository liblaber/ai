import { prisma } from '~/lib/prisma';
import type { Conversation, Prisma } from '@prisma/client';
import { StarterPluginManager } from '~/lib/plugins/starter/starter-plugin-manager';

export const conversationService = {
  async getConversation(conversationId: string): Promise<Conversation | null> {
    return await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
  },

  async createConversation(
    dataSourceId: string,
    userId: string,
    description?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Conversation> {
    const starterId = StarterPluginManager.starterId;

    return await (tx ?? prisma).conversation.create({
      data: {
        User: {
          connect: { id: userId },
        },
        dataSource: {
          connect: { id: dataSourceId },
        },
        description,
        starterId,
      },
    });
  },

  async updateConversationDescription(
    conversationId: string,
    userId: string,
    data: Partial<Conversation>,
  ): Promise<Conversation | null> {
    return await prisma.conversation.update({
      where: { id: conversationId, userId },
      data,
    });
  },

  async getAllConversations(userId: string): Promise<Conversation[]> {
    return await prisma.conversation.findMany({
      select: {
        id: true,
        description: true,
        starterId: true,
        dataSourceId: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
      },
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    await prisma.conversation.delete({
      where: { id: conversationId, userId },
    });
  },
};
