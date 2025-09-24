'use client';

import { AuthProvider } from './providers/AuthProvider';
import { StoreHydrator } from './providers/StoreHydrator';
import { OnboardingHandler } from './providers/OnboardingHandler';
import type { EnvironmentDataSource } from '~/lib/stores/environmentDataSources';
import type { PluginAccessMap } from '~/lib/plugins/types';
import type { EnvironmentVariableWithDetails } from '~/lib/stores/environmentVariables';
import type { UserProfile } from '~/lib/services/userService';
import { type DataSourceDescriptor } from '@liblab/data-access/utils/types';
import type { EnvironmentDeploymentMethod } from '~/lib/stores/deploymentMethods';
import type { DeploymentProviderInfo } from '~/lib/services/deploymentMethodService';

export interface RootData {
  user: UserProfile | null;
  environmentDataSources: EnvironmentDataSource[];
  environmentVariables: EnvironmentVariableWithDetails[];
  environmentDeploymentMethods: EnvironmentDeploymentMethod[];
  deploymentProviders: DeploymentProviderInfo[];
  pluginAccess: PluginAccessMap;
  dataSourceTypes: DataSourceDescriptor[];
}

interface DataLoaderProps {
  children: React.ReactNode;
  rootData: RootData;
}

export function DataLoader({ children, rootData }: DataLoaderProps) {
  return (
    <AuthProvider initialUser={rootData.user}>
      <StoreHydrator rootData={rootData}>
        <OnboardingHandler rootData={rootData}>{children}</OnboardingHandler>
      </StoreHydrator>
    </AuthProvider>
  );
}
