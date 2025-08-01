import { prisma } from '@/lib/prisma';
import type { Permission } from '@prisma/client';

export async function getUserPermissions(userId: string): Promise<Permission[]> {
  const userWithRoles = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: true,
            },
          },
        },
      },
    },
  });

  if (!userWithRoles) {
    return [];
  }

  // Flatten all permissions from all user roles
  const permissions = userWithRoles.roles.flatMap((userRole) => userRole.role.permissions);

  return permissions;
}
