'use client';

import { useEffect, useRef } from 'react';
import { signIn, useSession } from '~/auth/auth-client';
import { useDataSourcesStore } from '~/lib/stores/dataSources';
import { usePluginStore } from '~/lib/plugins/plugin-store';
import type { DataSourceType } from '~/lib/stores/dataSourceTypes';
import { useDataSourceTypesStore } from '~/lib/stores/dataSourceTypes';
import { useRouter } from 'next/navigation';
import type { PluginAccessMap } from '~/lib/plugins/types';
import { useUserStore } from '~/lib/stores/user';
import { DATA_SOURCE_CONNECTION_ROUTE, TELEMETRY_CONSENT_ROUTE } from '~/lib/constants/routes';
import { initializeClientTelemetry } from '~/lib/telemetry/telemetry-client';
import type { UserProfile } from '~/lib/services/userService';
import { useAuthProvidersPlugin } from '~/lib/hooks/plugins/useAuthProvidersPlugin';
import type { DataSource } from '~/components/@settings/tabs/data/DataTab';

export interface RootData {
  user: UserProfile | null;
  dataSources: Array<{
    id: string;
    name: string;
    connectionString: string;
    createdAt: string;
    updatedAt: string;
  }>;
  pluginAccess: PluginAccessMap;
  dataSourceTypes: DataSourceType[];
}

interface DataLoaderProps {
  children: React.ReactNode;
  rootData: RootData;
}

export function DataLoader({ children, rootData }: DataLoaderProps) {
  const { data: session } = useSession();
  const { setDataSources } = useDataSourcesStore();
  const { setPluginAccess } = usePluginStore();
  const { setDataSourceTypes } = useDataSourceTypesStore();
  const { setUser } = useUserStore();
  const { anonymousProvider } = useAuthProvidersPlugin();
  const router = useRouter();
  const isLoggingIn = useRef(false);

  useEffect(() => {
    const loadUserData = async () => {
      console.log('🔍 DataLoader auth check:', {
        hasSession: !!session?.user,
        hasAnonymousProvider: !!anonymousProvider,
        isLoggingIn: isLoggingIn.current,
      });

      if (!rootData.user && !session?.user && anonymousProvider && !isLoggingIn.current) {
        await loginAnonymous();
      }

      if (!rootData.user && !session?.user && anonymousProvider && isLoggingIn.current) {
        console.log('⏳ Anonymous login in progress, waiting...');
        return;
      }

      if (!rootData.user && !session?.user) {
        console.log('❌ No session available');
        return;
      }

      // Set plugin access and data source types (always available from server)
      if (rootData.pluginAccess) {
        setPluginAccess(rootData.pluginAccess);
      }

      if (rootData.dataSourceTypes) {
        setDataSourceTypes(rootData.dataSourceTypes);
      }

      // Handle user data
      let currentUser = rootData.user;

      if (!currentUser && session?.user) {
        console.log('🔄 Fetching user data...');
        currentUser = await fetchUserDataSync();
        setUser(currentUser);
      } else if (currentUser) {
        setUser(currentUser);
      }

      // Handle data sources
      let currentDataSources = rootData.dataSources || [];

      if ((!rootData.dataSources || rootData.dataSources.length === 0) && session?.user) {
        console.log('🔄 Fetching data sources...');
        currentDataSources = await fetchDataSourcesSync();
        setDataSources(currentDataSources);
      } else if (rootData.dataSources) {
        setDataSources(rootData.dataSources);
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
      }

      // Redirect to data source connection if no data sources exist
      if (currentDataSources.length === 0) {
        const currentPath = window.location.pathname;

        if (currentPath !== DATA_SOURCE_CONNECTION_ROUTE) {
          router.push(DATA_SOURCE_CONNECTION_ROUTE);
          return;
        }
      }

      console.log('✅ Data loading and redirects completed');
    };

    loadUserData();
  }, [session?.user, anonymousProvider, rootData, router]);

  const fetchUserDataSync = async (): Promise<UserProfile> => {
    try {
      const userResponse = await fetch('/api/me');

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userData = (await userResponse.json()) as {
        success: boolean;
        user: UserProfile;
      };

      console.log('✅ User data fetched successfully');

      return userData.user;
    } catch (error) {
      console.error('❌ Failed to fetch user data:', error);
      throw Error('Failed to fetch user data');
    }
  };

  const fetchDataSourcesSync = async (): Promise<DataSource[]> => {
    try {
      const dataSourcesResponse = await fetch('/api/data-sources');

      if (!dataSourcesResponse.ok) {
        throw new Error('Failed to fetch data sources');
      }

      const dataSourcesData = (await dataSourcesResponse.json()) as {
        success: boolean;
        dataSources: DataSource[];
      };

      console.log('✅ Data sources fetched successfully');

      return dataSourcesData.dataSources;
    } catch (error) {
      console.error('❌ Failed to fetch data sources:', error);
      return [];
    }
  };

  const loginAnonymous = async () => {
    if (isLoggingIn.current) {
      console.log('⏳ Login already in progress, skipping...');
      return;
    }

    isLoggingIn.current = true;

    try {
      console.log('🔐 Attempting anonymous login...');

      const { error: signInError } = await signIn.email({
        email: 'anonymous@anonymous.com',
        password: 'password1234',
        rememberMe: true,
      });

      if (signInError) {
        console.error('❌ Failed to sign in anonymous user:', signInError);
        return;
      }

      console.log('✅ Anonymous login successful');
      console.log('Current session is', session?.user);
    } catch (error: any) {
      console.error(`❌ Anonymous login failed: ${error?.message}`);
    } finally {
      isLoggingIn.current = false;
    }
  };

  return <>{children}</>;
}
