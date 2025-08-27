import { prisma } from '~/lib/prisma';
import type { Environment } from '@prisma/client';

export async function getEnvironment(id: string): Promise<Environment | null> {
  return prisma.environment.findUnique({
    where: { id },
    include: {
      dataSources: true,
      websites: true,
    },
  });
}

export async function getEnvironments(): Promise<Environment[]> {
  return prisma.environment.findMany({
    include: {
      dataSources: true,
      websites: true,
    },
  });
}

export async function createEnvironment(
  name: string,
  description: string | undefined = undefined,
): Promise<Environment> {
  return prisma.environment.create({
    data: {
      name,
      description: description || null,
    },
  });
}

export async function updateEnvironment(
  id: string,
  name: string,
  description: string | undefined = undefined,
): Promise<Environment> {
  return prisma.environment.update({
    where: { id },
    data: {
      name,
      description: description || null,
    },
  });
}

export async function deleteEnvironment(id: string) {
  return prisma.environment.delete({ where: { id } });
}
