import { type Organization, DeprecatedRole } from '@prisma/client';
import type { UserManagementPlugin } from './user-management-plugin-manager';
import { userService } from '~/lib/services/userService';
import { capitalizeFirstLetter, isFreeEmailDomain } from '~/lib/.server/llm/utils';
import { prisma } from '~/lib/prisma';

export class SingleUserManagement implements UserManagementPlugin {
  static pluginId = 'single-user';

  async createOrganizationFromEmail(email: string, userId: string): Promise<void> {
    const user = await userService.getUser(userId);

    if (user.organizationId) {
      return;
    }

    const [localPart, domain] = email.split('@');
    let organizationName: string;
    let organizationDomain: string | null = null;

    if (isFreeEmailDomain(domain)) {
      organizationName = capitalizeFirstLetter(localPart);
    } else {
      const domainWithoutExt = domain.split('.')[0];
      organizationName = capitalizeFirstLetter(domainWithoutExt);
      organizationDomain = domain;
    }

    const organization: Organization = await prisma.organization.create({
      data: {
        name: organizationName,
        domain: organizationDomain,
      },
    });

    // Check if this is the first premium user in the system (excluding anonymous users)
    const isFirstPremiumUser = await userService.isFirstPremiumUser();

    if (isFirstPremiumUser) {
      // Grant system admin access to the first premium user
      await userService.grantSystemAdminAccess(userId, organization.id);
      console.log(`🎉 First premium user ${email} granted system admin access`);
    } else {
      // Use regular role assignment for subsequent users
      await userService.setUserOrganizationAndRole(userId, organization.id, DeprecatedRole.ADMIN);
    }
  }
}
