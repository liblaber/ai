import { type Organization, UserRole } from '@prisma/client';
import type { UserManagementPlugin } from './user-management-plugin-manager';
import { freeEmailDomains } from 'free-email-domains-typescript';
import { userService } from '~/lib/services/userService';

export class SingleUserManagement implements UserManagementPlugin {
  static pluginId = 'single-user';

  async createOrganizationFromEmail(email: string, userId: string): Promise<void> {
    const existingMembers = await prisma.user.count();

    if (existingMembers > 1) {
      await userService.deleteUser(userId);
      return;
    }

    const user = await userService.getUser(userId);

    if (user.organizationId) {
      return;
    }

    const [localPart, domain] = email.split('@');
    let organizationName: string;
    let organizationDomain: string | null = null;

    if (SingleUserManagement._isFreeEmailDomain(domain)) {
      organizationName = SingleUserManagement._capitalizeFirstLetter(localPart);
    } else {
      const domainWithoutExt = domain.split('.')[0];
      organizationName = SingleUserManagement._capitalizeFirstLetter(domainWithoutExt);
      organizationDomain = domain;
    }

    const organization: Organization = await prisma.organization.create({
      data: {
        name: organizationName,
        domain: organizationDomain,
      },
    });

    await userService.updateUser(userId, {
      role: UserRole.ADMIN,
      organizationId: organization.id,
    });
  }

  private static _isFreeEmailDomain = (domain: string): boolean => {
    return freeEmailDomains.includes(domain.toLowerCase());
  };

  private static _capitalizeFirstLetter = (str: string): string => {
    return str[0].toUpperCase() + str.slice(1);
  };
}
