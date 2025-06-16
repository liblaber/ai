import type { Prisma, Snapshot } from '@prisma/client';
import { prisma } from '~/lib/prisma';

export const snapshotService = {
  async createSnapshot(snapshot: Omit<Snapshot, 'createdAt'>, tx?: Prisma.TransactionClient) {
    return (tx ?? prisma).snapshot.create({
      data: snapshot,
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

  async getSnapshotById(id: string) {
    return prisma.snapshot.findUnique({
      where: {
        id,
      },
    });
  },
};
