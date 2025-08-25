import { prisma } from '~/lib/prisma';
import { DeprecatedRole, PermissionAction, PermissionResource } from '@prisma/client';

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
    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      organizationId: user.organizationId,
      organization: user.organization,
      telemetryEnabled: user.telemetryEnabled,
    };
  },

  async updateUser(
    userId: string,
    data: Partial<Pick<UserProfile, 'name' | 'email' | 'image' | 'telemetryEnabled'>>,
  ): Promise<UserProfile> {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
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

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      organizationId: user.organizationId,
      organization: user.organization,
      telemetryEnabled: user.telemetryEnabled,
    };
  },

  async updateTelemetryConsent(userId: string, telemetryEnabled: boolean): Promise<UserProfile> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { telemetryEnabled },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        telemetryEnabled: true,
      },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      telemetryEnabled: user.telemetryEnabled,
    };
  },

  async getUsersByOrganization(organizationId: string): Promise<UserProfile[]> {
    const users = await prisma.user.findMany({
      where: {
        organizationId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        telemetryEnabled: true,
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
      organizationId: user.organizationId,
      telemetryEnabled: user.telemetryEnabled,
    }));
  },

  async getUsersByRole(roleId: string): Promise<UserProfile[]> {
    const userRoles = await prisma.userRole.findMany({
      where: {
        roleId,
      },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            organizationId: true,
            telemetryEnabled: true,
          },
        },
      },
    });

    return userRoles.map((userRole) => userRole.user);
  },

  async addUserToRole(userId: string, roleId: string): Promise<UserProfile> {
    const userRole = await prisma.userRole.create({
      data: {
        userId,
        roleId,
      },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            organizationId: true,
            telemetryEnabled: true,
          },
        },
      },
    });

    return userRole.user;
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
    return await prisma.user.update({
      where: { id: _userId },
      data: { role, organizationId },
    });
  },

  async setUserOrganizationAndRole(userId: string, organizationId: string, role: DeprecatedRole) {
    return await prisma.user.update({
      where: { id: userId },
      data: { organizationId, role },
    });
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
      // First, ensure the user has the organizationId set
      await prisma.user.update({
        where: { id: userId },
        data: { organizationId },
      });

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

      // Grant full permissions to the role
      const fullPermissions = [
        // Manage all resources (for CASL compatibility)
        { action: PermissionAction.manage, resource: PermissionResource.all },

        // Specific permissions for each resource
        { action: PermissionAction.read, resource: PermissionResource.DataSource },
        { action: PermissionAction.create, resource: PermissionResource.DataSource },
        { action: PermissionAction.update, resource: PermissionResource.DataSource },
        { action: PermissionAction.delete, resource: PermissionResource.DataSource },

        { action: PermissionAction.read, resource: PermissionResource.Environment },
        { action: PermissionAction.create, resource: PermissionResource.Environment },
        { action: PermissionAction.update, resource: PermissionResource.Environment },
        { action: PermissionAction.delete, resource: PermissionResource.Environment },

        { action: PermissionAction.read, resource: PermissionResource.Website },
        { action: PermissionAction.create, resource: PermissionResource.Website },
        { action: PermissionAction.update, resource: PermissionResource.Website },
        { action: PermissionAction.delete, resource: PermissionResource.Website },

        { action: PermissionAction.read, resource: PermissionResource.BuilderApp },
        { action: PermissionAction.create, resource: PermissionResource.BuilderApp },
        { action: PermissionAction.update, resource: PermissionResource.BuilderApp },
        { action: PermissionAction.delete, resource: PermissionResource.BuilderApp },

        { action: PermissionAction.read, resource: PermissionResource.AdminApp },
        { action: PermissionAction.create, resource: PermissionResource.AdminApp },
        { action: PermissionAction.update, resource: PermissionResource.AdminApp },
        { action: PermissionAction.delete, resource: PermissionResource.AdminApp },
      ];

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
