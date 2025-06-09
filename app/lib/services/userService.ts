import { prisma } from '~/lib/prisma';
import type { User } from '@prisma/client';

export const userService = {
  async getAllUsers(): Promise<User[]> {
    return prisma.user.findMany();
  },

  async getUserCredits(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user.credits;
  },

  async incrementUserCredits(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        credits: {
          increment: 1,
        },
      },
    });
  },

  async resetUsersCredits(): Promise<void> {
    await prisma.user.updateMany({
      data: {
        credits: 0,
      },
    });
  },
};
