'use client';

import { useEffect } from 'react';
import { useSession } from '~/auth/auth-client';
import { useDataSourcesStore } from '~/lib/stores/dataSources';
import { usePluginStore } from '~/lib/plugins/plugin-store';
import type { DataSourceType } from '~/lib/stores/dataSourceTypes';
import { useDataSourceTypesStore } from '~/lib/stores/dataSourceTypes';
import { useRouter } from 'next/navigation';
import { DATA_SOURCE_CONNECTION_ROUTE } from '~/lib/constants/routes';
import type { PluginAccessMap } from '~/lib/plugins/types';
import { useUserStore } from '~/lib/stores/user';

export interface RootData {
  user: any;
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
  const router = useRouter();

  useEffect(() => {
    if (!session?.user) {
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

    if (rootData.user) {
      setUser(rootData.user);
    }

    // Redirect to data source connection if no data sources exist
    if (rootData.dataSources && rootData.dataSources.length === 0) {
      const currentPath = window.location.pathname;

      if (currentPath !== DATA_SOURCE_CONNECTION_ROUTE) {
        router.push(DATA_SOURCE_CONNECTION_ROUTE);
      }
    }
  }, [session?.user, rootData, setDataSources, setPluginAccess, setDataSourceTypes, router]);

  return <>{children}</>;
}
