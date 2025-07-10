import { prisma } from '~/lib/prisma';
import type { UserRole } from '@prisma/client';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
}

export const userService = {
  async getUser(userId: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId!,
    };
  },

  async updateUser(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId!,
    };
  },

  async getUsersByOrganization(organizationId: string): Promise<UserProfile[]> {
    const users = await prisma.user.findMany({
      where: {
        organizationId,
      },
      select: {
        role: true,
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        email: 'asc',
      },
    });

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId,
    }));
  },

  async updateUserRole(userId: string, organizationId: string, role: UserRole) {
    const user = await prisma.user.update({
      where: { id: userId, organizationId },
      data: { role },
    });

    return user;
  },
};
