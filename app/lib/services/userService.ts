import { prisma } from '~/lib/prisma';
import { DeprecatedRole } from '@prisma/client';
import type { User } from '@prisma/client';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: DeprecatedRole;
  organizationId: string;
  telemetryEnabled: boolean | null;
  roles?: UserRole[];
}

export interface UserRole {
  id: string;
  name: string;
  description?: string | null;
}

type UserUpdateData = Partial<Omit<UserProfile, 'id' | 'roles'>>;

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  organizationId: true,
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
  const userProfile: UserProfile = {
    id: user.id,
    role: user.role,
    organizationId: user.organizationId!,
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

  async getUsersByOrganization(organizationId: string): Promise<UserProfile[]> {
    const users = await prisma.user.findMany({
      where: {
        organizationId,
      },
      select: userSelectWithRoles,
      orderBy: {
        email: 'asc',
      },
    });

    return users.map((user) => mapToUserProfile(user));
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

  async updateUserRole(userId: string, organizationId: string, role: DeprecatedRole) {
    return await prisma.user.update({
      where: { id: userId, organizationId },
      data: { role },
    });
  },
};
