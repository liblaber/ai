'use client';

import { useEffect } from 'react';
import { useSession } from '~/auth/auth-client';
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
  const { setUser, clearUser, user } = useUserStore();
  const router = useRouter();

  useEffect(() => {
    if (!session?.user) {
      clearUser();
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

      // Redirect to telemetry consent screen if user hasn't answered yet (when telemetryEnabled is null)
      if (rootData.user.telemetryEnabled === null) {
        const currentPath = window.location.pathname;

        if (currentPath !== TELEMETRY_CONSENT_ROUTE) {
          router.push(TELEMETRY_CONSENT_ROUTE);
        }

        return;
      }

      if (rootData.user.telemetryEnabled) {
        initializeClientTelemetry(rootData.user);
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
  }, [session?.user, rootData, setDataSources, setPluginAccess, setDataSourceTypes, setUser, clearUser, user, router]);

  return <>{children}</>;
}
