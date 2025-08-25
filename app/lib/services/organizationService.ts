import { prisma } from '~/lib/prisma';

export const organizationService = {
  async getOrganizationByUser(userId: string) {
    const member = await prisma.member.findFirst({
      where: { userId },
      include: { organization: { select: { id: true, name: true, domain: true } } },
    });

    return member?.organization || null;
  },

  async updateOrganizationByUser(userId: string, name: string) {
    const member = await prisma.member.findFirst({ where: { userId }, include: { organization: true } });

    if (!member) {
      throw new Error('User not found or not part of an organization');
    }

    const updatedOrganization = await prisma.organization.update({
      where: { id: member.organization!.id },
      data: { name },
    });

    return updatedOrganization;
  },
};
