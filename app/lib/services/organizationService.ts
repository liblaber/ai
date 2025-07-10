import { prisma } from '~/lib/prisma';

export const organizationService = {
  async getOrganizationByUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            domain: true,
          },
        },
      },
    });

    return user?.organization || null;
  },

  async updateOrganizationByUser(userId: string, name: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const updatedOrganization = await prisma.organization.update({
      where: { id: user.organization!.id },
      data: { name },
    });

    return updatedOrganization;
  },
};
