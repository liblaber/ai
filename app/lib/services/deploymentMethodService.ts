import { prisma } from '~/lib/prisma';
import { env } from '~/env';
import { decryptData, encryptData } from '@liblab/encryption/encryption';
import { DeploymentMethodCredentialsType, DeploymentProvider } from '@prisma/client';
import { type CreateDeploymentMethodInput, type UpdateDeploymentMethodInput } from '~/lib/validation/deploymentMethods';

export interface EnvironmentDeploymentMethod {
  id: string;
  name: string;
  provider: string;
  environmentId: string;
  environment: {
    id: string;
    name: string;
    description: string | null;
  };
  credentials: {
    id: string;
    type: string;
    value: string; // This will be decrypted
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const ENCRYPTION_KEY = env.server.ENCRYPTION_KEY;

function encryptValue(value: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('Encryption key not found');
  }

  const dataBuffer = Buffer.from(value);

  return encryptData(ENCRYPTION_KEY, dataBuffer);
}

function decryptValue(encryptedValue: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('Encryption key not found');
  }

  try {
    const dataBuffer = decryptData(ENCRYPTION_KEY, encryptedValue);
    return dataBuffer.toString();
  } catch (error) {
    throw new Error(`Failed to decrypt deployment method credential: ${error}`);
  }
}

export async function getEnvironmentDeploymentMethods(userId: string): Promise<EnvironmentDeploymentMethod[]> {
  const deploymentMethods = await prisma.deploymentMethod.findMany({
    where: {
      environment: {
        directPermissions: {
          some: {
            role: {
              users: {
                some: {
                  userId,
                },
              },
            },
          },
        },
      },
    },
    include: {
      environment: true,
      credentials: true,
    },
    orderBy: [{ environment: { name: 'asc' } }, { name: 'asc' }],
  });

  return deploymentMethods.map((dm) => ({
    ...dm,
    credentials: dm.credentials.map((cred) => ({
      ...cred,
      value: decryptValue(cred.value),
    })),
  }));
}

export async function getEnvironmentDeploymentMethod(
  deploymentMethodId: string,
  userId: string,
  environmentId: string,
): Promise<EnvironmentDeploymentMethod | null> {
  const deploymentMethod = await prisma.deploymentMethod.findFirst({
    where: {
      id: deploymentMethodId,
      environmentId,
      environment: {
        directPermissions: {
          some: {
            role: {
              users: {
                some: {
                  userId,
                },
              },
            },
          },
        },
      },
    },
    include: {
      environment: true,
      credentials: true,
    },
  });

  if (!deploymentMethod) {
    return null;
  }

  return {
    ...deploymentMethod,
    credentials: deploymentMethod.credentials.map((cred) => ({
      ...cred,
      value: decryptValue(cred.value),
    })),
  };
}

export async function createDeploymentMethod(data: CreateDeploymentMethodInput) {
  const { name, provider, environmentId, credentials } = data;

  // Validate that all required credentials are provided
  const requiredCredentials = getRequiredCredentialsForProvider(provider);
  const providedTypes = credentials.map((c) => c.type);
  const missingCredentials = requiredCredentials.filter((type) => !providedTypes.includes(type));

  if (missingCredentials.length > 0) {
    throw new Error(`Missing required credentials: ${missingCredentials.join(', ')}`);
  }

  // Encrypt all credential values
  const encryptedCredentials = credentials.map((cred) => ({
    type: cred.type,
    value: encryptValue(cred.value),
  }));

  return await prisma.$transaction(async (tx) => {
    const deploymentMethod = await tx.deploymentMethod.create({
      data: {
        name,
        provider,
        environmentId,
        credentials: {
          create: encryptedCredentials,
        },
      },
    });

    return deploymentMethod;
  });
}

export async function updateDeploymentMethod(id: string, data: UpdateDeploymentMethodInput) {
  const { name, provider, credentials } = data;

  return await prisma.$transaction(async (tx) => {
    // Update the deployment method
    const updatedDeploymentMethod = await tx.deploymentMethod.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(provider && { provider }),
      },
    });

    // If credentials are provided, update them
    if (credentials) {
      // Validate that all required credentials are provided
      // TODO: type
      const requiredCredentials = getRequiredCredentialsForProvider(
        (provider || updatedDeploymentMethod.provider) as any,
      );
      const providedTypes = credentials.map((c) => c.type);
      const missingCredentials = requiredCredentials.filter((type) => !providedTypes.includes(type));

      if (missingCredentials.length > 0) {
        throw new Error(`Missing required credentials: ${missingCredentials.join(', ')}`);
      }

      // Delete existing credentials
      await tx.deploymentMethodCredentials.deleteMany({
        where: { deploymentMethodId: id },
      });

      // Create new encrypted credentials
      const encryptedCredentials = credentials.map((cred) => ({
        type: cred.type,
        value: encryptValue(cred.value),
      }));

      await tx.deploymentMethodCredentials.createMany({
        data: encryptedCredentials.map((cred) => ({
          deploymentMethodId: id,
          type: cred.type,
          value: cred.value,
        })),
      });
    }

    return updatedDeploymentMethod;
  });
}

export async function deleteDeploymentMethod(id: string, userId: string): Promise<void> {
  // Check if user has permission to delete this deployment method
  const deploymentMethod = await prisma.deploymentMethod.findFirst({
    where: {
      id,
      environment: {
        directPermissions: {
          some: {
            role: {
              users: {
                some: {
                  userId,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!deploymentMethod) {
    throw new Error('Deployment method not found or access denied');
  }

  await prisma.$transaction(async (tx) => {
    // Delete credentials first (due to foreign key constraint)
    await tx.deploymentMethodCredentials.deleteMany({
      where: { deploymentMethodId: id },
    });

    // Delete the deployment method
    await tx.deploymentMethod.delete({
      where: { id },
    });
  });
}

export function getRequiredCredentialsForProvider(provider: DeploymentProvider): DeploymentMethodCredentialsType[] {
  switch (provider) {
    case DeploymentProvider.VERCEL:
      return [DeploymentMethodCredentialsType.API_KEY];
    case DeploymentProvider.NETLIFY:
      return [DeploymentMethodCredentialsType.API_KEY];
    case DeploymentProvider.AWS:
      return [
        DeploymentMethodCredentialsType.ACCESS_KEY,
        DeploymentMethodCredentialsType.SECRET_KEY,
        DeploymentMethodCredentialsType.REGION,
      ];
    default:
      return [];
  }
}

export function getProviderDisplayName(provider: DeploymentProvider): string {
  switch (provider) {
    case DeploymentProvider.VERCEL:
      return 'Vercel';
    case DeploymentProvider.NETLIFY:
      return 'Netlify';
    case DeploymentProvider.AWS:
      return 'AWS';
    default:
      return provider;
  }
}

export function getCredentialTypeDisplayName(type: DeploymentMethodCredentialsType): string {
  switch (type) {
    case DeploymentMethodCredentialsType.API_KEY:
      return 'API Key';
    case DeploymentMethodCredentialsType.ACCESS_KEY:
      return 'Access Key';
    case DeploymentMethodCredentialsType.SECRET_KEY:
      return 'Secret Key';
    case DeploymentMethodCredentialsType.REGION:
      return 'Region';
    default:
      return type;
  }
}
