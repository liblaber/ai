'use client';

import { useEffect } from 'react';
import { useEnvironmentDataSourcesStore, type EnvironmentDataSource } from '~/lib/stores/environmentDataSources';
import { usePluginStore } from '~/lib/plugins/plugin-store';
import { useDataSourceTypesStore } from '~/lib/stores/dataSourceTypes';
import { useUserStore } from '~/lib/stores/user';
import { useEnvironmentVariablesStore } from '~/lib/stores/environmentVariables';
import { useDeploymentMethodsStore, type EnvironmentDeploymentMethod } from '~/lib/stores/deploymentMethods';
import type { RootData } from '~/components/DataLoader';
import type { DeploymentProviderInfo } from '~/types/deployment-methods';

interface StoreHydratorProps {
  children: React.ReactNode;
  rootData: RootData;
}

export function StoreHydrator({ children, rootData }: StoreHydratorProps) {
  // Store setters
  const { setEnvironmentDataSources } = useEnvironmentDataSourcesStore();
  const { setPluginAccess } = usePluginStore();
  const { setDataSourceTypes } = useDataSourceTypesStore();
  const { setUser } = useUserStore();
  const { setEnvironmentVariables } = useEnvironmentVariablesStore();
  const { setEnvironmentDeploymentMethods, setProviders } = useDeploymentMethodsStore();

  // API fetch functions (kept in component for Next.js best practices)
  const fetchEnvironmentDataSources = async (): Promise<EnvironmentDataSource[]> => {
    try {
      const response = await fetch('/api/data-sources');
      const data = (await response.json()) as { success: boolean; environmentDataSources: EnvironmentDataSource[] };

      if (data.success) {
        return data.environmentDataSources;
      }

      return [];
    } catch (error) {
      console.error('Failed to fetch environment data sources:', error);
      return [];
    }
  };

  const fetchEnvironmentDeploymentMethods = async (): Promise<EnvironmentDeploymentMethod[]> => {
    try {
      const response = await fetch('/api/deployment-methods');
      const data = (await response.json()) as {
        success: boolean;
        environmentDeploymentMethods?: EnvironmentDeploymentMethod[];
      };

      if (data.success && data.environmentDeploymentMethods) {
        return data.environmentDeploymentMethods;
      }

      return [];
    } catch (error) {
      console.error('Failed to fetch deployment methods:', error);
      return [];
    }
  };

  const fetchDeploymentProviders = async (): Promise<DeploymentProviderInfo[]> => {
    try {
      const response = await fetch('/api/deployment-methods/providers');
      const data = (await response.json()) as DeploymentProviderInfo[];

      return data || [];
    } catch (error) {
      console.error('Failed to fetch deployment providers:', error);
      return [];
    }
  };

  // Expose refetch functions globally for use by other components
  useEffect(() => {
    // Attach refetch functions to window for global access (if needed)
    (window as any).refetchEnvironmentDataSources = async () => {
      const data = await fetchEnvironmentDataSources();
      setEnvironmentDataSources(data);

      return data;
    };

    (window as any).refetchEnvironmentDeploymentMethods = async () => {
      const data = await fetchEnvironmentDeploymentMethods();
      setEnvironmentDeploymentMethods(data);

      return data;
    };

    (window as any).refetchDeploymentProviders = async () => {
      const data = await fetchDeploymentProviders();
      setProviders(data);

      return data;
    };

    // Cleanup on unmount
    return () => {
      delete (window as any).refetchEnvironmentDataSources;
      delete (window as any).refetchEnvironmentDeploymentMethods;
      delete (window as any).refetchDeploymentProviders;
    };
  }, [setEnvironmentDataSources, setEnvironmentDeploymentMethods, setProviders]);

  // Hydrate all stores immediately with server data
  useEffect(() => {
    // Static data - always populated by server
    setPluginAccess(rootData.pluginAccess);
    setDataSourceTypes(rootData.dataSourceTypes);
    setProviders(rootData.deploymentProviders);

    // User-specific data - populated when user exists, empty arrays otherwise
    if (rootData.user) {
      setUser(rootData.user);
    }

    setEnvironmentDataSources(rootData.environmentDataSources);
    setEnvironmentVariables(rootData.environmentVariables);
    setEnvironmentDeploymentMethods(rootData.environmentDeploymentMethods);
  }, []); // No dependencies - server data is static

  return <>{children}</>;
}
