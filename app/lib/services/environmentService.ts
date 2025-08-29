import { prisma } from '~/lib/prisma';
import type { Environment } from '@prisma/client';

export interface EnvironmentWithRelations extends Environment {
  dataSources: any[];
  websites: any[];
  environmentVariables: any[];
}

export async function getEnvironment(id: string): Promise<EnvironmentWithRelations | null> {
  return prisma.environment.findUnique({
    where: { id },
    include: {
      dataSources: true,
      websites: true,
      environmentVariables: true,
    },
  });
}

export async function getEnvironmentName(id: string): Promise<string | null> {
  const env = await prisma.environment.findUnique({
    where: { id },
    select: {
      name: true,
    },
  });

  return env?.name ?? null;
}

export async function getEnvironments(): Promise<EnvironmentWithRelations[]> {
  const environments = await prisma.environment.findMany({
    include: {
      dataSources: {
        include: {
          dataSource: true,
        },
      },
      websites: true,
      environmentVariables: true,
    },
    orderBy: { name: 'asc' },
  });

  return environments.map((env) => ({
    ...env,
    // flatten dataSources
    dataSources: env.dataSources.map((ds) => ({
      ...ds.dataSource,
    })),
  }));
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
