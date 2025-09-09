'use client';

import { useEffect, useRef } from 'react';
import { signIn, useSession } from '~/auth/auth-client';
import { type EnvironmentDataSource, useEnvironmentDataSourcesStore } from '~/lib/stores/environmentDataSources';
import { usePluginStore } from '~/lib/plugins/plugin-store';
import { useDataSourceTypesStore } from '~/lib/stores/dataSourceTypes';
import { useRouter } from 'next/navigation';
import type { PluginAccessMap } from '~/lib/plugins/types';
import { useUserStore } from '~/lib/stores/user';
import { useEnvironmentVariablesStore } from '~/lib/stores/environmentVariables';
import { DATA_SOURCE_CONNECTION_ROUTE, TELEMETRY_CONSENT_ROUTE } from '~/lib/constants/routes';
import { initializeClientTelemetry } from '~/lib/telemetry/telemetry-client';
import type { UserProfile } from '~/lib/services/userService';
import { useAuthProvidersPlugin } from '~/lib/hooks/plugins/useAuthProvidersPlugin';
import { type DataSourceDescriptor } from '@liblab/data-access/utils/types';
import type { EnvironmentVariableWithDetails } from '~/lib/stores/environmentVariables';

export interface RootData {
  user: UserProfile | null;
  environmentDataSources: EnvironmentDataSource[];
  environmentVariables: EnvironmentVariableWithDetails[];
  pluginAccess: PluginAccessMap;
  dataSourceTypes: DataSourceDescriptor[];
}

interface DataLoaderProps {
  children: React.ReactNode;
  rootData: RootData;
}

export function DataLoader({ children, rootData }: DataLoaderProps) {
  const { data: session } = useSession();
  const { setEnvironmentDataSources } = useEnvironmentDataSourcesStore();
  const { setPluginAccess } = usePluginStore();
  const { setDataSourceTypes } = useDataSourceTypesStore();
  const { setUser } = useUserStore();
  const { setEnvironmentVariables } = useEnvironmentVariablesStore();
  const { anonymousProvider } = useAuthProvidersPlugin();
  const router = useRouter();
  const isLoggingIn = useRef(false);

  // Set plugin access immediately when component mounts
  useEffect(() => {
    if (rootData.pluginAccess) {
      setPluginAccess(rootData.pluginAccess);
    }

    if (rootData.dataSourceTypes) {
      setDataSourceTypes(rootData.dataSourceTypes);
    }

    if (rootData.environmentVariables) {
      setEnvironmentVariables(rootData.environmentVariables);
    }
  }, [
    rootData.pluginAccess,
    rootData.dataSourceTypes,
    rootData.environmentVariables,
    setPluginAccess,
    setDataSourceTypes,
    setEnvironmentVariables,
  ]);

  useEffect(() => {
    const loadUserData = async () => {
      // Only attempt anonymous login for free licenses or when Google OAuth is not configured
      if (!rootData.user && !session?.user && anonymousProvider && !isLoggingIn.current) {
        // Check if we're in a premium license with Google OAuth - if so, don't auto-login
        const isPremiumWithGoogle = !anonymousProvider; // If anonymous provider is not available, we're premium with Google

        if (!isPremiumWithGoogle) {
          await loginAnonymous();
          // this will trigger a re-render, and will re-fetch the data in layout.tsx
          router.refresh();
        }
      }

      if (!rootData.user && !session?.user && anonymousProvider && isLoggingIn.current) {
        console.debug('⏳ Anonymous login in progress, waiting...');
        return;
      }

      if (!rootData.user && !session?.user) {
        console.debug('❌ No session available');
        return;
      }

      // Handle user data
      let currentUser = rootData.user;

      if (!currentUser && session?.user) {
        console.debug('🔄 Fetching user data...');
        currentUser = await fetchUserData();
        setUser(currentUser);
      } else if (currentUser) {
        setUser(currentUser);
      }

      // Check user permissions after user data is loaded
      if (currentUser && session?.user) {
        let hasPermissions = false;

        try {
          const permissionsResponse = await fetch('/api/me/permissions/check');

          if (permissionsResponse.ok) {
            const data = (await permissionsResponse.json()) as { hasPermissions: boolean };
            hasPermissions = data.hasPermissions;
          }
        } catch (error) {
          console.error('❌ Error checking permissions:', error);
          // hasPermissions remains false, will trigger redirect
        }

        if (!hasPermissions) {
          console.debug('❌ User has no permissions or check failed, redirecting to access-denied');
          router.push('/access-denied');

          return;
        }
      }

      // Handle environment data sources
      let currentEnvironmentDataSources = rootData.environmentDataSources || [];

      if ((!rootData.environmentDataSources || rootData.environmentDataSources.length === 0) && session?.user) {
        console.debug('🔄 Fetching data sources...');
        currentEnvironmentDataSources = await fetchEnvironmentDataSources();
        setEnvironmentDataSources(currentEnvironmentDataSources);
      } else if (rootData.environmentDataSources) {
        setEnvironmentDataSources(currentEnvironmentDataSources);
      }

      // Handle environment variables
      let currentEnvironmentVariables = rootData.environmentVariables || [];

      if ((!rootData.environmentVariables || rootData.environmentVariables.length === 0) && session?.user) {
        console.debug('🔄 Fetching environment variables...');
        currentEnvironmentVariables = await fetchEnvironmentVariables();
        setEnvironmentVariables(currentEnvironmentVariables);
      } else if (rootData.environmentVariables) {
        setEnvironmentVariables(currentEnvironmentVariables);
      }

      // Handle user onboarding flow with telemetry and data sources
      if (currentUser) {
        // Redirect to telemetry consent screen if user hasn't answered yet
        if (currentUser.telemetryEnabled === null) {
          const currentPath = window.location.pathname;

          if (currentPath !== TELEMETRY_CONSENT_ROUTE) {
            router.push(TELEMETRY_CONSENT_ROUTE);
            return;
          }
        }

        // Initialize telemetry if enabled
        if (currentUser.telemetryEnabled) {
          initializeClientTelemetry(currentUser);
        }

        // Redirect to data source connection if no data sources exist
        if (currentEnvironmentDataSources.length === 0) {
          const currentPath = window.location.pathname;

          if (currentPath !== DATA_SOURCE_CONNECTION_ROUTE) {
            router.push(DATA_SOURCE_CONNECTION_ROUTE);
            return;
          }
        }
      }

      console.debug('✅ Data loading and redirects completed');
    };

    loadUserData();
  }, [session?.user, anonymousProvider, rootData, router]);

  const fetchUserData = async (): Promise<UserProfile> => {
    try {
      const userResponse = await fetch('/api/me');

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userData = (await userResponse.json()) as {
        success: boolean;
        user: UserProfile;
      };

      console.debug('✅ User data fetched successfully');

      return userData.user;
    } catch (error) {
      console.error('❌ Failed to fetch user data:', error);
      throw Error('Failed to fetch user data');
    }
  };

  const fetchEnvironmentDataSources = async (): Promise<EnvironmentDataSource[]> => {
    try {
      const environmentDataSourcesResponse = await fetch('/api/data-sources');

      if (!environmentDataSourcesResponse.ok) {
        throw new Error('Failed to fetch data sources');
      }

      const environmentDataSourcesData = (await environmentDataSourcesResponse.json()) as {
        success: boolean;
        environmentDataSources: EnvironmentDataSource[];
      };

      console.log('✅ Data sources fetched successfully');

      return environmentDataSourcesData.environmentDataSources;
    } catch (error) {
      console.error('❌ Failed to fetch data sources:', error);
      throw new Error('Failed to fetch data sources');
    }
  };

  const fetchEnvironmentVariables = async (): Promise<EnvironmentVariableWithDetails[]> => {
    try {
      // For now, we'll fetch environment variables for all environments the user has access to
      // In the future, this could be optimized to fetch only what's needed
      const environmentsResponse = await fetch('/api/environments');

      if (!environmentsResponse.ok) {
        throw new Error('Failed to fetch environments');
      }

      const environmentsData = (await environmentsResponse.json()) as {
        success: boolean;
        environments: Array<{ id: string }>;
      };

      if (!environmentsData.success || environmentsData.environments.length === 0) {
        return [];
      }

      // Fetch environment variables for the first environment (could be enhanced to fetch for all)
      const firstEnvironmentId = environmentsData.environments[0].id;
      const environmentVariablesResponse = await fetch(
        `/api/environment-variables?environmentId=${firstEnvironmentId}`,
      );

      if (!environmentVariablesResponse.ok) {
        throw new Error('Failed to fetch environment variables');
      }

      const environmentVariablesData = (await environmentVariablesResponse.json()) as {
        success: boolean;
        environmentVariables: EnvironmentVariableWithDetails[];
      };

      console.log('✅ Environment variables fetched successfully');

      return environmentVariablesData.environmentVariables || [];
    } catch (error) {
      console.error('❌ Failed to fetch environment variables:', error);
      return [];
    }
  };

  const loginAnonymous = async () => {
    if (isLoggingIn.current) {
      console.debug('⏳ Login already in progress, skipping...');
      return;
    }

    isLoggingIn.current = true;

    try {
      console.debug('🔐 Attempting anonymous login...');

      const { error: signInError } = await signIn.email({
        email: 'anonymous@anonymous.com',
        password: 'password1234',
        rememberMe: true,
      });

      if (signInError) {
        console.error('❌ Failed to sign in anonymous user:', signInError);
        return;
      }

      console.debug('✅ Anonymous login successful');
    } catch (error: any) {
      console.error(`❌ Anonymous login failed: ${error?.message}`);
    } finally {
      isLoggingIn.current = false;
    }
  };

  return <>{children}</>;
}
