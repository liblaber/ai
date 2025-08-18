import { prisma } from '~/lib/prisma';
import type { Role } from '@prisma/client';

export async function getRole(id: string): Promise<Role | null> {
  return prisma.role.findUnique({
    where: { id },
    include: {
      permissions: true,
    },
  });
}

export async function getRoles(): Promise<Role[]> {
  const roles = await prisma.role.findMany({
    include: {
      permissions: true,
      users: {
        include: {
          user: true,
        },
      },
    },
  });

  return roles.map((role) => ({
    ...role,
    users: role.users.map((user) => ({
      id: user.user.id,
      name: user.user.name,
      email: user.user.email,
    })),
  }));
}

export async function createRole(
  name: string,
  description: string | undefined = undefined,
  organizationId: string,
): Promise<Role> {
  return prisma.role.create({
    data: {
      name,
      description: description || null,
      organizationId,
    },
  });
}

export async function updateRole(id: string, name: string, description: string | undefined = undefined): Promise<Role> {
  return prisma.role.update({
    where: { id },
    data: {
      name,
      description: description || null,
    },
  });
}

export async function deleteRole(id: string) {
  return prisma.role.delete({ where: { id } });
}
