import { freeEmailDomains } from 'free-email-domains-typescript';
import type { UserManagementPlugin } from './user-management-plugin-manager';
import { UserRole, type Organization } from '@prisma/client';

export class MultiUserManagement implements UserManagementPlugin {
  static pluginId = 'multi-user';

  async createOrganizationFromEmail(email: string, userId: string): Promise<void> {
    const existingMembership = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (existingMembership?.organization) {
      return;
    }

    const [localPart, domain] = email.split('@');
    let organizationName: string;
    let organizationDomain: string | null = null;

    if (MultiUserManagement._isFreeEmailDomain(domain)) {
      organizationName = MultiUserManagement._capitalizeFirstLetter(localPart);
    } else {
      const domainWithoutExt = domain.split('.')[0];
      organizationName = MultiUserManagement._capitalizeFirstLetter(domainWithoutExt);
      organizationDomain = domain;
    }

    let organization: Organization | null = null;

    if (organizationDomain) {
      organization = await prisma.organization.findUnique({
        where: { domain: organizationDomain },
      });
    }

    if (!organization) {
      organization = await prisma.organization.create({
        data: {
          name: organizationName,
          domain: organizationDomain,
        },
      });
    }

    const existingMembers = await prisma.user.count({
      where: { organizationId: organization.id },
    });

    const role: UserRole = existingMembers === 0 ? UserRole.ADMIN : UserRole.MEMBER;

    await prisma.user.update({
      where: { id: userId },
      data: {
        organizationId: organization.id,
        role,
      },
    });
  }

  private static _isFreeEmailDomain = (domain: string): boolean => {
    return freeEmailDomains.includes(domain.toLowerCase());
  };

  private static _capitalizeFirstLetter = (str: string): string => {
    return str[0].toUpperCase() + str.slice(1);
  };
}
