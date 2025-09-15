import { prisma } from '~/lib/prisma';
import {
  type Environment,
  EnvironmentVariableType,
  PermissionAction,
  PermissionResource,
  Prisma,
} from '@prisma/client';
import { buildResourceWhereClause } from '@/lib/casl/prisma-helpers';
import type { AppAbility } from '~/lib/casl/user-ability';

export interface EnvironmentWithRelations extends Environment {
  dataSources: any[];
  websites: any[];
  environmentVariables: any[];
}

type GetEnvironmentsFilter = {
  environmentVariableType?: EnvironmentVariableType;
};

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

export async function getEnvironments(
  userAbility: AppAbility,
  { environmentVariableType }: GetEnvironmentsFilter = {},
): Promise<EnvironmentWithRelations[]> {
  const whereClause = buildResourceWhereClause(
    userAbility,
    PermissionAction.read,
    PermissionResource.Environment,
  ) as Prisma.EnvironmentWhereInput;

  const environments = await prisma.environment.findMany({
    where: whereClause,
    include: {
      dataSources: {
        include: {
          dataSource: true,
        },
      },
      websites: true,
      environmentVariables: {
        where: environmentVariableType ? { type: environmentVariableType } : undefined,
      },
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
