import { prisma } from '~/lib/prisma';
import { type Conversation, type EnvironmentDataSource, type Prisma } from '@prisma/client';
import { StarterPluginManager } from '~/lib/plugins/starter/starter-plugin-manager';

// TODO: @skos Update the whole service based on the new schema design
export const conversationService = {
  async getConversation(conversationId: string): Promise<Conversation | null> {
    return await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
  },

  async getConversationEnvironmentDataSource(conversationId: string): Promise<EnvironmentDataSource> {
    return await prisma.conversation
      .findUniqueOrThrow({
        where: { id: conversationId },
      })
      .environmentDataSource();
  },

  async createConversation(
    dataSourceId: string,
    environmentId: string,
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
        environmentDataSource: {
          connect: {
            environmentId_dataSourceId: {
              environmentId,
              dataSourceId,
            },
          },
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
        environmentDataSource: true,
        snapshots: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        dataSourceId: true,
        environmentId: true,
      },
      where: {
        userId,
        snapshots: {
          some: {},
        },
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
