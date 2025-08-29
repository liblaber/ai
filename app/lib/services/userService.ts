import { prisma } from '~/lib/prisma';
import { DeprecatedRole } from '@prisma/client';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: DeprecatedRole;
  telemetryEnabled?: boolean | null;
}

export const userService = {
  async getUser(userId: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
      telemetryEnabled: user.telemetryEnabled,
    };
  },

  async getAllUsers(): Promise<UserProfile[]> {
    const users = await prisma.user.findMany({ where: { isAnonymous: { not: true } } });
    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      telemetryEnabled: user.telemetryEnabled,
    }));
  },

  async getUserByEmail(email: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({
      where: { email },
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
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
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
        telemetryEnabled: true,
      },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      telemetryEnabled: user.telemetryEnabled,
    };
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

  async updateUserRole(_userId: string, role: DeprecatedRole) {
    return await prisma.user.update({
      where: { id: _userId },
      data: { role },
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

  async grantSystemAdminAccess(userId: string): Promise<void> {
    try {
      // // First, ensure the user has the organizationId set and role set to ADMIN
      // await prisma.user.update({
      //   where: { id: userId },
      //   data: {
      //     role: DeprecatedRole.ADMIN, // Set legacy role field to ADMIN for first user
      //   },
      // });

      // // Create a System Admin role if it doesn't exist
      // let systemAdminRole = await prisma.role.findFirst({
      //   where: {
      //     name: 'System Admin',
      //   },
      // });

      // if (!systemAdminRole) {
      //   systemAdminRole = await prisma.role.create({
      //     data: {
      //       name: 'System Admin',
      //       description: 'Full system administrator with all privileges across all organizations',
      //     },
      //   });
      // }

      // // Assign the role to the user
      // await prisma.userRole.upsert({
      //   where: {
      //     userId_roleId: {
      //       userId,
      //       roleId: systemAdminRole.id,
      //     },
      //   },
      //   update: {},
      //   create: {
      //     userId,
      //     roleId: systemAdminRole.id,
      //   },
      // });

      // Create the UserRole Join

      const systemAdminRole = await prisma.role.findFirst({
        where: {
          name: 'Admin',
        },
      });

      if (!systemAdminRole) {
        throw new Error('System Admin role not found');
      }

      await prisma.userRole.create({
        data: {
          userId,
          roleId: systemAdminRole.id,
        },
      });

      // Set the deprecated role
      await prisma.user.update({
        where: { id: userId },
        data: { role: DeprecatedRole.ADMIN },
      });

      console.log(`✅ Granted system admin access to user ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to grant system admin access to user ${userId}:`, error);
      throw new Error(
        `Failed to grant system admin access: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  },
};
