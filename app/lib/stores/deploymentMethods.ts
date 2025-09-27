import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type DeploymentProviderInfo } from '~/types/deployment-methods';

export interface DeploymentMethodCredential {
  id: string;
  type: string;
  value: string;
}

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
  credentials: DeploymentMethodCredential[];
  createdAt: Date;
  updatedAt: Date;
}

interface DeploymentMethodsStore {
  environmentDeploymentMethods: EnvironmentDeploymentMethod[];
  selectedEnvironmentDeploymentMethod: { deploymentMethodId: string | null; environmentId: string | null };
  providers: DeploymentProviderInfo[];
  setEnvironmentDeploymentMethods: (environmentDeploymentMethods: EnvironmentDeploymentMethod[]) => void;
  setSelectedEnvironmentDeploymentMethod: (deploymentMethodId: string | null, environmentId: string | null) => void;
  setProviders: (providers: DeploymentProviderInfo[]) => void;
  clearEnvironmentDeploymentMethods: () => void;
}

export const useDeploymentMethodsStore = create<DeploymentMethodsStore>()(
  persist(
    (set, getState) => ({
      environmentDeploymentMethods: [],
      selectedEnvironmentDeploymentMethod: { deploymentMethodId: null, environmentId: null },
      providers: [],
      setEnvironmentDeploymentMethods: (environmentDeploymentMethods) => {
        set({ environmentDeploymentMethods });

        if (environmentDeploymentMethods.length === 0) {
          getState().setSelectedEnvironmentDeploymentMethod(null, null);
          return;
        }

        const selectedEnvironmentDeploymentMethod = getState().selectedEnvironmentDeploymentMethod;

        if (
          selectedEnvironmentDeploymentMethod.deploymentMethodId &&
          selectedEnvironmentDeploymentMethod.environmentId &&
          environmentDeploymentMethods.some(
            (edm) =>
              edm.id === selectedEnvironmentDeploymentMethod.deploymentMethodId &&
              edm.environmentId === selectedEnvironmentDeploymentMethod.environmentId,
          )
        ) {
          return;
        }

        getState().setSelectedEnvironmentDeploymentMethod(
          environmentDeploymentMethods[0].id,
          environmentDeploymentMethods[0].environmentId,
        );
      },
      setSelectedEnvironmentDeploymentMethod: (deploymentMethodId: string | null, environmentId: string | null) =>
        set({ selectedEnvironmentDeploymentMethod: { deploymentMethodId, environmentId } }),
      setProviders: (providers) => set({ providers }),
      clearEnvironmentDeploymentMethods: () => set({ environmentDeploymentMethods: [] }),
    }),
    {
      name: 'deployment-methods-storage',
    },
  ),
);

export const useDeploymentMethodActions = () => {
  const { setSelectedEnvironmentDeploymentMethod, clearEnvironmentDeploymentMethods } = useDeploymentMethodsStore();

  const loadDeploymentMethods = async () => {
    // API call is now handled by StoreHydrator component
    // Use the globally available refetch function
    if (typeof window !== 'undefined' && (window as any).refetchEnvironmentDeploymentMethods) {
      await (window as any).refetchEnvironmentDeploymentMethods();
    }
  };

  const loadProviders = async () => {
    // API call is now handled by StoreHydrator component
    // Use the globally available refetch function
    if (typeof window !== 'undefined' && (window as any).refetchDeploymentProviders) {
      await (window as any).refetchDeploymentProviders();
    }
  };

  const selectDeploymentMethod = (deploymentMethodId: string, environmentId: string) => {
    setSelectedEnvironmentDeploymentMethod(deploymentMethodId, environmentId);
  };

  const clearSelection = () => {
    setSelectedEnvironmentDeploymentMethod(null, null);
  };

  return {
    loadDeploymentMethods,
    loadProviders,
    selectDeploymentMethod,
    clearSelection,
    clearEnvironmentDeploymentMethods,
  };
};
