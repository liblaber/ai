// Environment types
export interface Environment {
  id: string;
  name: string;
  description?: string;
}

export interface EnvironmentOption {
  label: string;
  value: string;
  description?: string;
}

// API Response types
export interface EnvironmentsResponse {
  success: boolean;
  environments: Environment[];
  error?: string;
}

export interface DeploymentMethodResponse {
  success: boolean;
  message?: string;
  error?: string;
  deploymentMethod?: {
    id: string;
  };
  environmentDeploymentMethods?: Array<{
    id: string;
    name: string;
    provider: string;
    environmentId: string;
    environment: {
      id: string;
      name: string;
      description: string | null;
    };
    credentials: Array<{
      id: string;
      type: string;
      value: string;
    }>;
    createdAt: string;
    updatedAt: string;
  }>;
}

// Re-export provider info type for convenience
export type { DeploymentProviderInfo } from '~/lib/validation/deploymentMethods';
