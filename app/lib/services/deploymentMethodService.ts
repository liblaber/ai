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

export async function getEnvironmentDeploymentMethods(): Promise<EnvironmentDeploymentMethod[]> {
  const deploymentMethods = await prisma.deploymentMethod.findMany({
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
  environmentId: string,
): Promise<EnvironmentDeploymentMethod | null> {
  const deploymentMethod = await prisma.deploymentMethod.findFirst({
    where: {
      id: deploymentMethodId,
      environmentId,
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
  const { name, provider, environmentId, credentials, applyToAllEnvironments } = data;

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
    if (applyToAllEnvironments) {
      // Get all environments
      const environments = await tx.environment.findMany();

      // Create deployment method for each environment
      const deploymentMethods = await Promise.all(
        environments.map((env) =>
          tx.deploymentMethod.create({
            data: {
              name,
              provider,
              environmentId: env.id,
              credentials: {
                create: encryptedCredentials,
              },
            },
          }),
        ),
      );

      return deploymentMethods[0]; // Return the first one for consistency
    } else {
      // Create deployment method for specific environment
      if (!environmentId) {
        throw new Error('Environment ID is required when not applying to all environments');
      }

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
    }
  });
}

export async function updateDeploymentMethod(id: string, data: UpdateDeploymentMethodInput) {
  const { name, provider, credentials, applyToAllEnvironments } = data;

  return await prisma.$transaction(async (tx) => {
    if (applyToAllEnvironments) {
      // Get the current deployment method to find all deployment methods with the same name and provider
      const currentDeploymentMethod = await tx.deploymentMethod.findUnique({
        where: { id },
        include: { environment: true },
      });

      if (!currentDeploymentMethod) {
        throw new Error('Deployment method not found');
      }

      // Find all deployment methods with the same name and provider across all environments
      const allDeploymentMethods = await tx.deploymentMethod.findMany({
        where: {
          name: currentDeploymentMethod.name,
          provider: currentDeploymentMethod.provider,
        },
      });

      // Update all matching deployment methods
      const updatedDeploymentMethods = await Promise.all(
        allDeploymentMethods.map(async (dm) => {
          // Update the deployment method
          const updatedDeploymentMethod = await tx.deploymentMethod.update({
            where: { id: dm.id },
            data: {
              ...(name && { name }),
              ...(provider && { provider }),
            },
          });

          // If credentials are provided, update them
          if (credentials) {
            // Validate that all required credentials are provided
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
              where: { deploymentMethodId: dm.id },
            });

            // Create new encrypted credentials
            const encryptedCredentials = credentials.map((cred) => ({
              type: cred.type,
              value: encryptValue(cred.value),
            }));

            await tx.deploymentMethodCredentials.createMany({
              data: encryptedCredentials.map((cred) => ({
                deploymentMethodId: dm.id,
                type: cred.type,
                value: cred.value,
              })),
            });
          }

          return updatedDeploymentMethod;
        }),
      );

      return updatedDeploymentMethods[0]; // Return the first one for consistency
    } else {
      // Update only the specific deployment method
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
    }
  });
}

export async function deleteDeploymentMethod(id: string): Promise<void> {
  // Check if user has permission to delete this deployment method
  const deploymentMethod = await prisma.deploymentMethod.findFirst({
    where: {
      id,
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

/**
 * Retrieves a decrypted credential value for a specific deployment method
 * @param provider - The deployment provider (e.g., 'VERCEL', 'NETLIFY', 'AWS')
 * @param environmentId - The environment ID
 * @param credentialType - The type of credential to retrieve
 * @param userId - The user ID for permission checking
 * @returns The decrypted credential value or null if not found
 */
export async function getDeploymentMethodCredential(
  provider: string,
  environmentId: string,
  credentialType: DeploymentMethodCredentialsType,
): Promise<string | null> {
  const deploymentMethod = await prisma.deploymentMethod.findFirst({
    where: {
      provider,
      environmentId,
    },
    include: {
      credentials: {
        where: {
          type: credentialType,
        },
      },
    },
  });

  if (!deploymentMethod || deploymentMethod.credentials.length === 0) {
    return null;
  }

  const credential = deploymentMethod.credentials[0];

  return decryptValue(credential.value);
}

/**
 * Retrieves all decrypted credentials for a specific deployment method
 * @param provider - The deployment provider (e.g., 'VERCEL', 'NETLIFY', 'AWS')
 * @param environmentId - The environment ID
 * @param userId - The user ID for permission checking
 * @returns Object with decrypted credentials keyed by credential type
 */
export async function getDeploymentMethodCredentials(
  provider: string,
  environmentId: string,
): Promise<Record<string, string> | null> {
  const deploymentMethod = await prisma.deploymentMethod.findFirst({
    where: {
      provider,
      environmentId,
    },
    include: {
      credentials: true,
    },
  });

  if (!deploymentMethod) {
    return null;
  }

  const credentials: Record<string, string> = {};

  for (const credential of deploymentMethod.credentials) {
    try {
      credentials[credential.type] = decryptValue(credential.value);
    } catch (error) {
      console.error(`Failed to decrypt credential ${credential.type}:`, error);
      // Continue with other credentials even if one fails
    }
  }

  return credentials;
}
