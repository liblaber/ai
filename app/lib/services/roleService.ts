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
  return prisma.role.findMany({
    include: {
      permissions: true,
    },
  });
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
