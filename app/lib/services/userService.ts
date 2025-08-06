import { prisma } from '~/lib/prisma';
import { DeprecatedRole } from '@prisma/client';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: DeprecatedRole;
  organizationId: string;
  telemetryEnabled: boolean | null;
}

export const userService = {
  async getUser(userId: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        telemetryEnabled: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId!,
      telemetryEnabled: user.telemetryEnabled,
    };
  },

  async updateUser(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId!,
      telemetryEnabled: user.telemetryEnabled,
    };
  },

  async updateTelemetryConsent(userId: string, telemetryEnabled: boolean): Promise<UserProfile> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { telemetryEnabled },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId!,
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
      telemetryEnabled: user.telemetryEnabled,
      organizationId,
    }));
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
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        telemetryEnabled: true,
      },
    });

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId!,
      telemetryEnabled: user.telemetryEnabled,
    }));
  },

  async updateUserRole(userId: string, organizationId: string, role: DeprecatedRole) {
    return await prisma.user.update({
      where: { id: userId, organizationId },
      data: { role },
    });
  },
};
