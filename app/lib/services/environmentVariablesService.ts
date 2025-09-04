import { prisma } from '~/lib/prisma';
import type { EnvironmentVariable, EnvironmentVariableType } from '@prisma/client';
import { decryptData, encryptData } from '@liblab/encryption/encryption';
import { env } from '~/env';
import { logger } from '~/utils/logger';

type PrismaTransaction = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

export async function getEnvironmentVariable(id: string): Promise<EnvironmentVariable | null> {
  const envVar = await prisma.environmentVariable.findUnique({
    where: { id },
    include: {
      environment: true,
      createdBy: true,
    },
  });

  return envVar ? decryptEnvironmentVariable(envVar) : null;
}

export async function getEnvironmentVariables(): Promise<EnvironmentVariable[]> {
  const envVars = await prisma.environmentVariable.findMany({
    include: {
      environment: true,
      createdBy: true,
    },
    orderBy: { key: 'asc' },
  });

  return envVars.map(decryptEnvironmentVariable);
}

export async function getEnvironmentVariablesWithEnvironmentDetails(
  environmentId: string | 'all',
  type?: EnvironmentVariableType | null,
): Promise<
  Array<
    EnvironmentVariable & {
      environment: { id: string; name: string };
      createdBy: { id: string; name: string; email: string };
    }
  >
> {
  let envVars;

  // Build the where clause
  const whereClause: any = {};

  if (environmentId !== 'all') {
    whereClause.environmentId = environmentId;
  }

  if (type) {
    whereClause.type = type;
  }

  if (environmentId === 'all') {
    // Get all environment variables from all environments
    envVars = await prisma.environmentVariable.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: {
        environment: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ environment: { name: 'asc' } }, { key: 'asc' }],
    });
  } else {
    // Get environment variables for a specific environment
    envVars = await prisma.environmentVariable.findMany({
      where: whereClause,
      include: {
        environment: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { key: 'asc' },
    });
  }

  return envVars.map(decryptEnvironmentVariableWithRelations);
}

export async function createEnvironmentVariable(
  key: string,
  value: string,
  type: EnvironmentVariableType,
  environmentId: string,
  createdById: string,
  description?: string,
  dataSourceId?: string,
  tx?: PrismaTransaction,
): Promise<EnvironmentVariable> {
  const encryptedValue = encryptValue(value);
  const client = tx || prisma;

  const envVar = await client.environmentVariable.create({
    data: {
      key,
      value: encryptedValue,
      description: description || null,
      type,
      environmentId,
      createdById,
    },
  });

  return decryptEnvironmentVariable(envVar);
}

export async function updateEnvironmentVariable(
  id: string,
  key: string,
  value: string,
  type: EnvironmentVariableType,
  environmentId: string,
  description?: string,
): Promise<EnvironmentVariable> {
  const valueToStore = encryptValue(value);

  const envVar = await prisma.environmentVariable.update({
    where: { id },
    data: {
      key,
      value: valueToStore,
      description: description || null,
      type,
      environmentId,
    },
  });

  return decryptEnvironmentVariable(envVar);
}

export async function deleteEnvironmentVariable(id: string) {
  return prisma.environmentVariable.delete({ where: { id } });
}

export async function getEnvironmentVariableByKey(
  key: string,
  environmentId: string,
): Promise<EnvironmentVariable | null> {
  const envVar = await prisma.environmentVariable.findUnique({
    where: {
      key_environmentId: {
        key,
        environmentId,
      },
    },
    include: {
      environment: true,
      createdBy: true,
    },
  });

  return envVar ? decryptEnvironmentVariable(envVar) : null;
}

export function decryptEnvironmentVariable(envVar: EnvironmentVariable): EnvironmentVariable {
  try {
    return {
      ...envVar,
      value: decryptValue(envVar.value),
    };
  } catch (error) {
    logger.error('Failed to decrypt environment variable:', envVar.id, error);

    throw new Error(`Failed to decrypt environment variable: ${envVar.key}`);
  }
}

function encryptValue(value: string): string {
  const encryptionKey = env.server.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('Encryption key not found');
  }

  const dataBuffer = Buffer.from(value);

  return encryptData(encryptionKey, dataBuffer);
}

function decryptValue(encryptedValue: string): string {
  const encryptionKey = env.server.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('Encryption key not found');
  }

  const decryptedBuffer = decryptData(encryptionKey, encryptedValue);

  return decryptedBuffer.toString();
}

function decryptEnvironmentVariableWithRelations(
  envVar: EnvironmentVariable & {
    environment: { id: string; name: string };
    createdBy: { id: string; name: string; email: string };
  },
): EnvironmentVariable & {
  environment: { id: string; name: string };
  createdBy: { id: string; name: string; email: string };
} {
  try {
    return {
      ...envVar,
      value: decryptValue(envVar.value),
    };
  } catch (error) {
    logger.error('Failed to decrypt environment variable:', envVar.id, error);

    throw new Error(`Failed to decrypt environment variable: ${envVar.key}`);
  }
}
