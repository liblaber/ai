import { z } from 'zod';
import { DeploymentMethodCredentialsType, DeploymentProvider } from '@prisma/client';

export const deploymentMethodCredentialsTypeSchema = z.nativeEnum(DeploymentMethodCredentialsType);
export const deploymentProviderSchema = z.nativeEnum(DeploymentProvider);

export const credentialFieldSchema = z.object({
  type: deploymentMethodCredentialsTypeSchema,
  value: z.string().min(1, 'Credential value is required'),
});

export const createDeploymentMethodSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
    provider: deploymentProviderSchema,
    environmentId: z.string().min(1, 'Environment ID is required').optional(),
    applyToAllEnvironments: z.boolean().optional().default(false),
    credentials: z.array(credentialFieldSchema).min(1, 'At least one credential is required'),
  })
  .refine(
    (data) => {
      // If applyToAllEnvironments is true, environmentId is not required
      // If applyToAllEnvironments is false or undefined, environmentId is required
      if (data.applyToAllEnvironments) {
        return true; // environmentId not required when applying to all environments
      }

      return data.environmentId !== undefined && data.environmentId !== null; // environmentId required when not applying to all environments
    },
    {
      message: 'Environment ID is required when not applying to all environments',
      path: ['environmentId'],
    },
  );

export const updateDeploymentMethodSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters').optional(),
  provider: deploymentProviderSchema.optional(),
  applyToAllEnvironments: z.boolean().optional().default(false),
  credentials: z.array(credentialFieldSchema).min(1, 'At least one credential is required').optional(),
});

export const environmentDeploymentMethodSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string(),
  environmentId: z.string(),
  environment: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
  }),
  credentials: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      value: z.string(),
    }),
  ),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const deploymentProviderInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  requiredCredentials: z.array(z.string()),
});

export type CreateDeploymentMethodInput = z.infer<typeof createDeploymentMethodSchema>;
export type UpdateDeploymentMethodInput = z.infer<typeof updateDeploymentMethodSchema>;
export type EnvironmentDeploymentMethodType = z.infer<typeof environmentDeploymentMethodSchema>;
export type DeploymentProviderInfo = z.infer<typeof deploymentProviderInfoSchema>;
export type CredentialField = z.infer<typeof credentialFieldSchema>;
