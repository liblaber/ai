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
  const { dataSources, setDataSources } = useDataSourcesStore();
  const { setPluginAccess } = usePluginStore();
  const { setDataSourceTypes } = useDataSourceTypesStore();
  const { setUser, clearUser, user } = useUserStore();
  const { anonymousProvider } = useAuthProvidersPlugin();
  const router = useRouter();
  const isLoggingIn = useRef(false);

  useEffect(() => {
    console.log('🔍 DataLoader auth check:', {
      hasSession: !!session?.user,
      hasAnonymousProvider: !!anonymousProvider,
      isLoggingIn: isLoggingIn.current,
    });

    // If no session and anonymous provider is available, try anonymous login
    if (!session?.user && anonymousProvider && !isLoggingIn.current) {
      loginAnonymous();

      return;
    }

    // If login is in progress, wait for it to complete
    if (!session?.user && anonymousProvider && isLoggingIn.current) {
      console.log('⏳ Anonymous login in progress, waiting...');
      return;
    }

    if (!rootData.user && session?.user) {
      console.log('🔄 Session exists but no server user data, fetching user data...');
      fetchUserData();

      return;
    }

    if (!rootData.user && session?.user) {
      console.log('🔄 Session exists but no server data sources, fetching data sources...');
      fetchDataSources();

      return;
    }

    // Set data sources
    if (rootData.dataSources) {
      setDataSources(rootData.dataSources);
    }

    // Set plugin access
    if (rootData.pluginAccess) {
      setPluginAccess(rootData.pluginAccess);
    }

    // Set data source types
    if (rootData.dataSourceTypes) {
      setDataSourceTypes(rootData.dataSourceTypes);
    }

    // Set user profile
    if (rootData.user) {
      setUser(rootData.user);
    }

    if (user) {
      // Redirect to telemetry consent screen if user hasn't answered yet (when telemetryEnabled is null)
      if (user.telemetryEnabled === null) {
        const currentPath = window.location.pathname;

        if (currentPath !== TELEMETRY_CONSENT_ROUTE) {
          router.push(TELEMETRY_CONSENT_ROUTE);
        }

        return;
      }

      if (user.telemetryEnabled) {
        initializeClientTelemetry(user);
      }
    }

    // Redirect to data source connection if no data sources exist
    if (rootData.dataSources && rootData.dataSources.length === 0) {
      const currentPath = window.location.pathname;

      if (currentPath !== DATA_SOURCE_CONNECTION_ROUTE) {
        router.push(DATA_SOURCE_CONNECTION_ROUTE);
      }

      router.push(DATA_SOURCE_CONNECTION_ROUTE);

      return;
    }
  }, [
    session?.user,
    anonymousProvider,
    rootData,
    dataSources,
    setDataSources,
    setPluginAccess,
    setDataSourceTypes,
    setUser,
    clearUser,
    user,
    router,
  ]);

  const fetchUserData = async () => {
    try {
      console.log('📡 Fetching user data...');

      const userResponse = await fetch('/api/me');

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userData = (await userResponse.json()) as {
        success: boolean;
        user: UserProfile;
      };

      console.log('✅ User data fetched successfully');
      setUser(userData.user);
    } catch (error) {
      console.error('❌ Failed to fetch user data:', error);
    }
  };

  const fetchDataSources = async () => {
    try {
      console.log('📡 Fetching data sources...');

      const dataSourcesResponse = await fetch('/api/data-sources');

      if (!dataSourcesResponse.ok) {
        throw new Error('Failed to fetch data sources');
      }

      const dataSourcesData = (await dataSourcesResponse.json()) as {
        success: boolean;
        dataSources: DataSource[];
      };

      console.log('✅ Data sources fetched successfully');
      setDataSources(dataSourcesData.dataSources);
    } catch (error) {
      console.error('❌ Failed to fetch data sources:', error);
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
    } catch (error: any) {
      console.error(`❌ Anonymous login failed: ${error?.message}`);
    } finally {
      isLoggingIn.current = false;
    }
  };

  return <>{children}</>;
}
