import { z } from 'zod';
import { DeploymentMethodCredentialsType, DeploymentProvider } from '@prisma/client';

export const deploymentMethodCredentialsTypeSchema = z.nativeEnum(DeploymentMethodCredentialsType);
export const deploymentProviderSchema = z.nativeEnum(DeploymentProvider);

export const credentialFieldSchema = z.object({
  type: deploymentMethodCredentialsTypeSchema,
  value: z.string().min(1, 'Credential value is required'),
});

export const createDeploymentMethodSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  provider: deploymentProviderSchema,
  environmentId: z.string().min(1, 'Environment ID is required'),
  credentials: z.array(credentialFieldSchema).min(1, 'At least one credential is required'),
});

export const updateDeploymentMethodSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters').optional(),
  provider: deploymentProviderSchema.optional(),
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
