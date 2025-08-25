import { capitalizeFirstLetter, isFreeEmailDomain } from '~/lib/.server/llm/utils';
import type { UserManagementPlugin } from './user-management-plugin-manager';
import { DeprecatedRole, type Organization } from '@prisma/client';
import { userService } from '~/lib/services/userService';
import { prisma } from '~/lib/prisma';

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

    if (isFreeEmailDomain(domain)) {
      organizationName = capitalizeFirstLetter(localPart);
    } else {
      const domainWithoutExt = domain.split('.')[0];
      organizationName = capitalizeFirstLetter(domainWithoutExt);
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

    // Check if this is the first premium user in the system (excluding anonymous users)
    const isFirstPremiumUser = await userService.isFirstPremiumUser(userId);

    if (isFirstPremiumUser) {
      // Grant system admin access to the first premium user
      await userService.grantSystemAdminAccess(userId, organization.id);
      console.log(`🎉 First premium user ${email} granted system admin access`);
    } else {
      // Use regular role assignment for subsequent users
      const role: DeprecatedRole = existingMembers === 0 ? DeprecatedRole.ADMIN : DeprecatedRole.MEMBER;

      await prisma.user.update({
        where: { id: userId },
        data: {
          organizationId: organization.id,
          role,
        },
      });
    }
  }
}
