import { prisma } from '~/lib/prisma';
import { type Conversation, type Prisma } from '@prisma/client';
import { StarterPluginManager } from '~/lib/plugins/starter/starter-plugin-manager';
import { getEnvironmentDataSource } from '~/lib/services/datasourceService';

export const conversationService = {
  async getConversation(conversationId: string): Promise<Conversation | null> {
    return await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
  },

  async getConversationEnvironmentDataSource(conversationId: string) {
    const conversation = await prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
    });

    const environmentDataSource = await getEnvironmentDataSource(conversation.dataSourceId, conversation.environmentId);

    if (!environmentDataSource) {
      throw new Error('Environment data source not found');
    }

    return environmentDataSource;
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

  async updateConversation(
    conversationId: string,
    userId: string,
    data: Partial<Conversation>,
  ): Promise<Conversation | null> {
    return await prisma.conversation.update({
      where: { id: conversationId, userId },
      data,
    });
  },

  async getAllConversations(userId: string): Promise<(Conversation & { editedAt: Date | null })[]> {
    const conversations = await prisma.conversation.findMany({
      select: {
        id: true,
        description: true,
        starterId: true,
        environmentDataSource: true,
        snapshots: {
          select: {
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
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

    // Calculate editedAt field from the latest snapshot
    return conversations.map((conversation) => ({
      ...conversation,
      snapshots: undefined, // Reset to undefined to match original Conversation type
      editedAt: new Date(
        Math.max(conversation.snapshots[0]?.createdAt?.getTime() || 0, conversation.updatedAt.getTime()),
      ),
    }));
  },

  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    await prisma.conversation.delete({
      where: { id: conversationId, userId },
    });
  },
};
