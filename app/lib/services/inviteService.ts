import { prisma } from '~/lib/prisma';
import { InviteStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export interface UserInviteData {
  id: string;
  email: string;
  roleId: string;
  roleName: string;
  status: InviteStatus;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt?: Date | null;
  invitedBy: string;
}

export const inviteService = {
  async createInvite(email: string, roleId: string, invitedBy: string): Promise<UserInviteData> {
    // Check if user already exists and has the role
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (existingUser) {
      // Check if user already has this role
      const hasRole = existingUser.roles.some((userRole) => userRole.role.id === roleId);

      if (hasRole) {
        throw new Error('User already has this role');
      }
    }

    // Check if there's already a pending invite for this email
    const existingInvite = await prisma.userInvite.findFirst({
      where: {
        email,
        status: InviteStatus.PENDING,
      },
    });

    if (existingInvite) {
      throw new Error('A pending invite already exists for this email');
    }

    // Get role information
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new Error('Role not found');
    }

    // Create invite with 7 days expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await prisma.userInvite.create({
      data: {
        id: uuidv4(),
        email,
        roleId,
        invitedBy,
        expiresAt,
        status: InviteStatus.PENDING,
        updatedAt: new Date(),
      },
      include: {
        role: true,
      },
    });

    return {
      id: invite.id,
      email: invite.email,
      roleId: invite.roleId,
      roleName: role.name,
      status: invite.status,
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt,
      acceptedAt: invite.acceptedAt,
      invitedBy: invite.invitedBy,
    };
  },

  async getInvitesByStatus(status: InviteStatus): Promise<UserInviteData[]> {
    const invites = await prisma.userInvite.findMany({
      where: { status },
      include: {
        role: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return invites.map((invite) => ({
      id: invite.id,
      email: invite.email,
      roleId: invite.roleId,
      roleName: invite.role.name,
      status: invite.status,
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt,
      acceptedAt: invite.acceptedAt,
      invitedBy: invite.invitedBy,
    }));
  },

  async getInviteByEmail(email: string): Promise<UserInviteData | null> {
    const invite = await prisma.userInvite.findFirst({
      where: {
        email,
        status: InviteStatus.PENDING,
      },
      include: {
        role: true,
      },
    });

    if (!invite) {
      return null;
    }

    return {
      id: invite.id,
      email: invite.email,
      roleId: invite.roleId,
      roleName: invite.role.name,
      status: invite.status,
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt,
      acceptedAt: invite.acceptedAt,
      invitedBy: invite.invitedBy,
    };
  },

  async acceptInvite(inviteId: string, userId: string): Promise<void> {
    const invite = await prisma.userInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      throw new Error('Invite not found');
    }

    if (invite.status !== InviteStatus.PENDING) {
      throw new Error('Invite is no longer valid');
    }

    if (invite.expiresAt < new Date()) {
      throw new Error('Invite has expired');
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if user email matches invite email
    if (user.email !== invite.email) {
      throw new Error('User email does not match invite email');
    }

    // Check if user already has this role
    const existingUserRole = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId: invite.roleId,
        },
      },
    });

    if (existingUserRole) {
      // User already has this role, just mark invite as accepted
      await prisma.userInvite.update({
        where: { id: inviteId },
        data: {
          status: InviteStatus.ACCEPTED,
          acceptedAt: new Date(),
          existingUserId: userId,
        },
      });
      return;
    }

    // Add user to role
    await prisma.$transaction([
      prisma.userRole.create({
        data: {
          userId,
          roleId: invite.roleId,
        },
      }),
      prisma.userInvite.update({
        where: { id: inviteId },
        data: {
          status: InviteStatus.ACCEPTED,
          acceptedAt: new Date(),
          existingUserId: userId,
        },
      }),
    ]);
  },

  async deleteInvite(inviteId: string): Promise<void> {
    const invite = await prisma.userInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      throw new Error('Invite not found');
    }

    await prisma.userInvite.delete({
      where: { id: inviteId },
    });
  },

  async expireInvites(): Promise<void> {
    await prisma.userInvite.updateMany({
      where: {
        status: InviteStatus.PENDING,
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        status: InviteStatus.EXPIRED,
      },
    });
  },
};
