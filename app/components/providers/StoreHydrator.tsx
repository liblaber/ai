'use client';

import { useEffect } from 'react';
import { useEnvironmentDataSourcesStore } from '~/lib/stores/environmentDataSources';
import { usePluginStore } from '~/lib/plugins/plugin-store';
import { useDataSourceTypesStore } from '~/lib/stores/dataSourceTypes';
import { useUserStore } from '~/lib/stores/user';
import { useEnvironmentVariablesStore } from '~/lib/stores/environmentVariables';
import { useDeploymentMethodsStore } from '~/lib/stores/deploymentMethods';
import type { RootData } from '~/components/DataLoader';

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
