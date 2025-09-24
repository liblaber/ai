import { prisma } from '~/lib/prisma';
import type { User } from '@prisma/client';
import { RoleScope } from '@prisma/client';
import { invalidateUserAbilityCache } from '~/lib/casl/user-ability';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('user-service');

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  telemetryEnabled?: boolean | null;
  roles?: UserRole[];
}

export interface UserRole {
  id: string;
  name: string;
  description?: string | null;
}

export interface UserWithRole {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  roleId: string;
  roleName: string;
  telemetryEnabled?: boolean | null;
}

type UserUpdateData = Partial<Omit<UserProfile, 'id' | 'roles'>>;

const userSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  telemetryEnabled: true,
};

const userSelectWithRoles = {
  ...userSelect,
  roles: {
    select: {
      role: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
  },
};

type UserWithRoles = Partial<User> & {
  roles?: { role: { id: string; name: string; description: string | null } }[];
};

function mapToUserProfile(user: UserWithRoles): UserProfile {
  const userProfile = {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    telemetryEnabled: user.telemetryEnabled,
  } as UserProfile;

  if (user.roles) {
    userProfile.roles = user.roles.map((r) => ({
      id: r.role.id,
      name: r.role.name,
      description: r.role.description || undefined,
    }));
  }

  return userProfile;
}

export const userService = {
  async getUser(userId: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userSelectWithRoles,
    });

    if (!user) {
      throw new Error('User not found');
    }

    return mapToUserProfile(user);
  },

  async getAllUsers(): Promise<UserProfile[]> {
    const users = await prisma.user.findMany({
      where: {
        OR: [{ isAnonymous: false }, { isAnonymous: null }],
      },
      select: userSelectWithRoles,
    });

    return users.map((user) => mapToUserProfile(user));
  },

  async getUserByEmail(email: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: userSelectWithRoles,
    });

    if (!user) {
      throw new Error('User not found');
    }

    return mapToUserProfile(user);
  },

  async updateUser(userId: string, data: UserUpdateData): Promise<UserProfile> {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: userSelect,
    });

    return mapToUserProfile(user);
  },

  async updateTelemetryConsent(userId: string, telemetryEnabled: boolean): Promise<UserProfile> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { telemetryEnabled },
      select: userSelect,
    });

    return mapToUserProfile(user);
  },

  async getUsersByRole(roleId: string): Promise<UserProfile[]> {
    const users = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            roleId,
          },
        },
      },
      select: userSelect,
    });

    return users.map((user) => mapToUserProfile(user));
  },

  async addUserToRole(userId: string, roleId: string): Promise<UserProfile> {
    const userRole = await prisma.userRole.create({
      data: {
        userId,
        roleId,
      },
      select: {
        user: {
          select: userSelectWithRoles,
        },
      },
    });

    return mapToUserProfile(userRole.user);
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

  async isApplicationSetUp(): Promise<boolean> {
    try {
      // Check if there are any admin users
      const adminCount = await prisma.userRole.count({
        where: {
          role: {
            name: 'Admin',
          },
        },
      });

      return adminCount > 0;
    } catch (error) {
      logger.error('Error checking if application is set up:', error);
      return false;
    }
  },

  async grantSystemAdminAccess(userId: string): Promise<void> {
    try {
      // Create the UserRole Join

      const systemAdminRole = await prisma.role.findFirst({
        where: {
          name: 'Admin',
        },
      });

      if (!systemAdminRole) {
        throw new Error('System Admin role not found');
      }

      try {
        await prisma.userRole.create({
          data: {
            userId,
            roleId: systemAdminRole.id,
          },
        });
      } catch {}

      logger.info(`Granted system admin access to user ${userId}`);
    } catch (error) {
      logger.error(`Failed to grant system admin access to user ${userId}:`, error);
      throw new Error(
        `Failed to grant system admin access: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  },

  async getAllUsersWithRoles(): Promise<UserWithRole[]> {
    const users = await prisma.user.findMany({
      where: {
        OR: [{ isAnonymous: false }, { isAnonymous: null }],
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    return users
      .filter((user) => user.roles.length > 0) // Only include users who have at least one role
      .map((user) => {
        // Get the highest scoped role (Admin > Member, etc.)
        // Sort roles by name to get consistent ordering, with Admin first
        const sortedRoles = user.roles.sort((a, b) => {
          const roleA = a.role.name.toLowerCase();
          const roleB = b.role.name.toLowerCase();

          if (roleA === 'admin') {
            return -1;
          }

          if (roleB === 'admin') {
            return 1;
          }

          return roleA.localeCompare(roleB);
        });

        const primaryRole = sortedRoles[0]?.role;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          roleId: primaryRole?.id || '',
          roleName: primaryRole?.name || 'No Role',
          telemetryEnabled: user.telemetryEnabled,
        };
      });
  },

  async getAllUsersWithoutRoles(): Promise<UserWithRole[]> {
    const users = await prisma.user.findMany({
      where: {
        OR: [{ isAnonymous: false }, { isAnonymous: null }],
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    return users
      .filter((user) => user.roles.length === 0) // Only include users who have no roles
      .map((user) => {
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          roleId: '',
          roleName: 'No Role',
          telemetryEnabled: user.telemetryEnabled,
        };
      });
  },

  async updateUserRoleToNewSystem(userId: string, roleId: string): Promise<UserWithRole> {
    // First, verify the role exists
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new Error('Role not found');
    }

    // First, remove all existing general roles for the user
    await prisma.userRole.deleteMany({
      where: {
        userId,
        role: {
          scope: RoleScope.GENERAL,
          resourceId: null,
        },
      },
    });

    // Add the new role
    await prisma.userRole.create({
      data: {
        userId,
        roleId,
      },
    });

    // Get the updated user with role information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    // invalidate their ability cache
    invalidateUserAbilityCache(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Get the highest scoped role (Admin > Member, etc.)
    const sortedRoles = user.roles.sort((a, b) => {
      const roleA = a.role.name.toLowerCase();
      const roleB = b.role.name.toLowerCase();

      if (roleA === 'admin') {
        return -1;
      }

      if (roleB === 'admin') {
        return 1;
      }

      return roleA.localeCompare(roleB);
    });

    const primaryRole = sortedRoles[0]?.role;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      roleId: primaryRole?.id || '',
      roleName: primaryRole?.name || 'No Role',
      telemetryEnabled: user.telemetryEnabled,
    };
  },
};
