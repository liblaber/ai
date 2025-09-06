import { prisma } from '~/lib/prisma';
import type { EnvironmentVariable, EnvironmentVariableType } from '@prisma/client';
import { encryptData, decryptData } from '@liblab/encryption/encryption';
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

export async function getEnvironmentVariables(environmentId: string): Promise<EnvironmentVariable[]> {
  const envVars = await prisma.environmentVariable.findMany({
    where: { environmentId },
    include: {
      environment: true,
      createdBy: true,
    },
    orderBy: { key: 'asc' },
  });

  return envVars.map(decryptEnvironmentVariable);
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
  try {
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
  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('key_environmentId')) {
      throw new Error(`Environment variable with key '${key}' already exists in this environment.`);
    }

    throw error;
  }
}

export async function updateEnvironmentVariable(
  id: string,
  key: string,
  value: string,
  type: EnvironmentVariableType,
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
