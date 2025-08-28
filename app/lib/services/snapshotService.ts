import { type Conversation, type Prisma, type Snapshot } from '@prisma/client';
import { prisma } from '~/lib/prisma';

type CreateSnapshotModel = Omit<Snapshot, 'createdAt' | 'id'> & {
  id?: string;
  conversation?: Conversation; // Allow conversation object but we'll filter it out
};

export const snapshotService = {
  async createSnapshot(snapshot: CreateSnapshotModel, tx?: Prisma.TransactionClient) {
    // Filter out the conversation object and undefined values
    const { conversation, ...snapshotData } = snapshot;

    // Only include the fields that are part of the Snapshot model
    const cleanData: Prisma.SnapshotUncheckedCreateInput = {
      ...(snapshotData.id && { id: snapshotData.id }),
      storageType: snapshotData.storageType,
      storageKey: snapshotData.storageKey,
      conversationId: snapshotData.conversationId,

      // deliberately comparing != null to cover both null and undefined
      ...(snapshotData.messageId != null && { messageId: snapshotData.messageId }),
    };

    return (tx ?? prisma).snapshot.create({
      data: cleanData,
    });
  },

  async getLatestSnapshot(conversationId: string) {
    return prisma.snapshot.findFirst({
      where: {
        conversationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  async getLatestSnapshotForMessages(messageIds: string[]) {
    return prisma.snapshot.findFirst({
      where: {
        messageId: { in: messageIds },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  async getSnapshotById(id: string) {
    return prisma.snapshot.findUnique({
      where: {
        id,
      },
      include: {
        message: true,
      },
    });
  },

  async getSnapshotByMessageId(messageId: string) {
    return prisma.snapshot.findUnique({
      where: {
        messageId,
      },
      include: {
        message: true,
      },
    });
  },
};
