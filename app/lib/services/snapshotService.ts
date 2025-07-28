import type { Prisma, Snapshot } from '@prisma/client';
import { prisma } from '~/lib/prisma';

type CreateSnapshotModel = Omit<Snapshot, 'createdAt' | 'id'> & {
  id?: string;
};

export const snapshotService = {
  async createSnapshot(snapshot: CreateSnapshotModel, tx?: Prisma.TransactionClient) {
    return (tx ?? prisma).snapshot.create({
      data: {
        ...snapshot,
        conversationId: snapshot.conversationId,
        ...(snapshot.messageId
          ? {
              messageId: snapshot.messageId,
            }
          : {}),
      },
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
};
