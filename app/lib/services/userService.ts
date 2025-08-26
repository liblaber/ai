import { prisma } from '~/lib/prisma';
import { DeprecatedRole } from '@prisma/client';
import { SYSTEM_ADMIN_PERMISSIONS } from '~/lib/constants/permissions';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: DeprecatedRole;
  organizationId?: string | null;
  organization?: {
    id: string;
    name: string;
    domain?: string | null;
  } | null;
  telemetryEnabled?: boolean | null;
}

export const userService = {
  async getUser(userId: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    const member = await prisma.member.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { organization: true },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      organizationId: member?.organization?.id ?? null,
      organization: member?.organization ?? null,
      telemetryEnabled: user.telemetryEnabled,
    };
  },

  async getUserByEmail(email: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new Error('User not found');
    }

    const member = await prisma.member.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { organization: true },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      organizationId: member?.organization?.id ?? null,
      organization: member?.organization ?? null,
      telemetryEnabled: user.telemetryEnabled,
    };
  },

  async updateUser(
    userId: string,
    data: Partial<Pick<UserProfile, 'name' | 'email' | 'image' | 'telemetryEnabled'>>,
  ): Promise<UserProfile> {
    const user = await prisma.user.update({ where: { id: userId }, data });

    const member = await prisma.member.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { organization: true },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      organizationId: member?.organization?.id ?? null,
      organization: member?.organization ?? null,
      telemetryEnabled: user.telemetryEnabled,
    };
  },

  async updateTelemetryConsent(userId: string, telemetryEnabled: boolean): Promise<UserProfile> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { telemetryEnabled },
      select: { id: true, name: true, email: true, role: true, telemetryEnabled: true },
    });

    const member = await prisma.member.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { organization: true },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: member?.organization?.id ?? null,
      telemetryEnabled: user.telemetryEnabled,
    };
  },

  async getUsersByOrganization(organizationId: string): Promise<UserProfile[]> {
    const members = await prisma.member.findMany({
      where: { organizationId },
      include: { user: { select: { id: true, name: true, email: true, role: true, telemetryEnabled: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.user.role,
      organizationId,
      telemetryEnabled: m.user.telemetryEnabled,
    }));
  },

  async getUsersByRole(roleId: string): Promise<UserProfile[]> {
    const userRoles = await prisma.userRole.findMany({
      where: { roleId },
      include: { user: { select: { id: true, name: true, email: true, role: true, telemetryEnabled: true } } },
    });

    return userRoles.map((userRole) => userRole.user);
  },

  async addUserToRole(userId: string, roleId: string): Promise<UserProfile> {
    const { user } = await prisma.userRole.create({
      data: { userId, roleId },
      include: { user: { select: { id: true, name: true, email: true, role: true, telemetryEnabled: true } } },
    });

    return user;
  },

  async removeUserFromRole(userId: string, roleId: string): Promise<void> {
    await prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });
  },

  async updateUserRole(_userId: string, organizationId: string, role: DeprecatedRole) {
    // Update deprecated role and create member link if provided

    if (organizationId) {
      const member = await prisma.member.findFirst({ where: { userId: _userId, organizationId } });

      if (!member) {
        await prisma.member.create({
          data: { userId: _userId, organizationId, role: role === DeprecatedRole.ADMIN ? 'Admin' : 'Member' },
        });
      }
    }

    return await prisma.user.update({ where: { id: _userId }, data: { role } });
  },

  async setUserOrganizationAndRole(userId: string, organizationId: string, role: DeprecatedRole) {
    // Atomically create or update the member link to avoid races
    const memberRole = role === DeprecatedRole.ADMIN ? 'Admin' : 'Member';

    // Construct the composite unique where object and cast only the where to `any` to satisfy the generated types.
    const whereObj = { userId_organizationId: { userId, organizationId } } as any;

    await prisma.member.upsert({
      where: whereObj,
      update: { role: memberRole },
      create: { userId, organizationId, role: memberRole },
    });

    return await prisma.user.update({ where: { id: userId }, data: { role } });
  },

  async isFirstPremiumUser(): Promise<boolean> {
    // Check if this is the first non-anonymous user in the system
    // isAnonymous can be null (for OAuth users) or false (for non-anonymous users)
    const nonAnonymousUserCount = await prisma.user.count({
      where: {
        OR: [{ isAnonymous: false }, { isAnonymous: null }],
      },
    });

    // If there's only 1 non-anonymous user, this is the first one
    return nonAnonymousUserCount === 1;
  },

  async grantSystemAdminAccess(userId: string, organizationId: string): Promise<void> {
    try {
      // First, ensure a member link exists and role set to ADMIN
      const member = await prisma.member.findFirst({ where: { userId, organizationId } });

      if (!member) {
        await prisma.member.create({ data: { userId, organizationId, role: 'Admin' } });
      }

      await prisma.user.update({ where: { id: userId }, data: { role: DeprecatedRole.ADMIN } });

      // Create a System Admin role if it doesn't exist
      let systemAdminRole = await prisma.role.findFirst({
        where: {
          organizationId,
          name: 'System Admin',
        },
      });

      if (!systemAdminRole) {
        systemAdminRole = await prisma.role.create({
          data: {
            name: 'System Admin',
            description: 'Full system administrator with all privileges across all organizations',
            organizationId,
          },
        });
      }

      // Assign the role to the user
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId,
            roleId: systemAdminRole.id,
          },
        },
        update: {},
        create: {
          userId,
          roleId: systemAdminRole.id,
        },
      });

      // Grant full permissions to the role using centralized permission definitions
      const fullPermissions = SYSTEM_ADMIN_PERMISSIONS;

      // Fetch existing permissions for the role once to avoid N+1 query problem
      const existingPermissions = await prisma.permission.findMany({
        where: { roleId: systemAdminRole.id },
        select: { resource: true, action: true },
      });

      const existingPermissionSet = new Set(existingPermissions.map((p) => `${p.resource}:${p.action}`));

      for (const permission of fullPermissions) {
        // Check if permission already exists in memory
        const permissionKey = `${permission.resource}:${permission.action}`;

        if (!existingPermissionSet.has(permissionKey)) {
          await prisma.permission.create({
            data: {
              roleId: systemAdminRole.id,
              resource: permission.resource,
              action: permission.action,
            },
          });
        }
      }

      console.log(`✅ Granted system admin access to user ${userId} in organization ${organizationId}`);
    } catch (error) {
      console.error(`❌ Failed to grant system admin access to user ${userId}:`, error);
      throw new Error(
        `Failed to grant system admin access: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  },
};
