import { prisma } from '~/lib/prisma';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export const userService = {
  async getUser(userId: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  },
};
