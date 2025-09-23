import { create } from 'zustand';
import { useRouter } from 'next/navigation';
import { persist } from 'zustand/middleware';
import { DATA_SOURCE_CONNECTION_ROUTE } from '~/lib/constants/routes';
import { DataSourcePropertyType, type DataSourceType } from '@liblab/data-access/utils/types';

export interface EnvironmentVariable {
  id: string;
  key: string;
  value: string;
  description: string | null;
  // this must be synced with EnvironmentVariableType enum in prisma
  type: 'GLOBAL' | 'DATA_SOURCE';
  environmentId: string;
  dataSourceId: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnvironmentDataSource {
  createdAt: Date;
  updatedAt: Date;
  dataSourceId: string;
  environmentId: string;
  conversationCount: number;
  environment: {
    id: string;
    name: string;
    description: string | null;
  };
  dataSource: {
    id: string;
    name: string;
    createdAt: Date;
    type: DataSourceType;
    typeLabel: string;
    updatedAt: Date;
  };
  dataSourceProperties: [
    {
      type: DataSourcePropertyType;
      environmentVariable: EnvironmentVariable;
    },
  ];
}

export interface DataSourceWithEnvironments {
  id: string;
  name: string;
  type: DataSourceType;
  typeLabel: string;
  environments: {
    id: string;
    name: string;
    conversationCount: number;
    dataSourceProperties: {
      type: DataSourcePropertyType;
      value: string;
    }[];
  }[];
}

interface EnvironmentDataSourcesStore {
  environmentDataSources: EnvironmentDataSource[];
  dataSources: DataSourceWithEnvironments[];
  selectedEnvironmentDataSource: { dataSourceId: string | null; environmentId: string | null };
  selectedEnvironmentDataSourceName: string | null;
  setEnvironmentDataSources: (environmentDataSources: EnvironmentDataSource[]) => void;
  setSelectedEnvironmentDataSource: (dataSourceId: string | null, environmentId: string | null) => void;
  clearEnvironmentDataSources: () => void;
}

export const useEnvironmentDataSourcesStore = create<EnvironmentDataSourcesStore>()(
  persist(
    (set, getState) => ({
      environmentDataSources: [],
      dataSources: [],
      selectedEnvironmentDataSource: { dataSourceId: null, environmentId: null },
      selectedEnvironmentDataSourceName: null,
      setEnvironmentDataSources: (environmentDataSources) => {
        // Build derived dataSources grouped by dataSource
        const grouped: Record<string, DataSourceWithEnvironments> = {};

        for (const eds of environmentDataSources) {
          const dataSourceId = eds.dataSource.id;

          if (!grouped[dataSourceId]) {
            grouped[dataSourceId] = {
              id: eds.dataSource.id,
              name: eds.dataSource.name,
              type: eds.dataSource.type,
              typeLabel: eds.dataSource.typeLabel,
              environments: [],
            };
          }

          grouped[dataSourceId].environments.push({
            id: eds.environment.id,
            name: eds.environment.name,
            conversationCount: eds.conversationCount,
            dataSourceProperties:
              eds.dataSourceProperties?.map((prop) => ({
                type: prop.type,
                value: prop.environmentVariable?.value ?? '',
              })) || [],
          });
        }

        const dataSources: DataSourceWithEnvironments[] = Object.values(grouped);

        set({ environmentDataSources, dataSources });

        if (environmentDataSources.length === 0) {
          getState().setSelectedEnvironmentDataSource(null, null);
          return;
        }

        const selectedEnvironmentDataSource = getState().selectedEnvironmentDataSource;

        if (
          selectedEnvironmentDataSource.dataSourceId &&
          selectedEnvironmentDataSource.environmentId &&
          environmentDataSources.some(
            (eds) =>
              eds.dataSourceId === selectedEnvironmentDataSource.dataSourceId &&
              eds.environmentId === selectedEnvironmentDataSource.environmentId,
          )
        ) {
          return;
        }

        getState().setSelectedEnvironmentDataSource(
          environmentDataSources[0].dataSourceId,
          environmentDataSources[0].environmentId,
        );
      },
      setSelectedEnvironmentDataSource: (dataSourceId: string | null, environmentId: string | null) => {
        const selectedEnvironmentDataSourceName = getState().dataSources.find((ds) => ds.id === dataSourceId)?.name;
        return set({
          selectedEnvironmentDataSource: { dataSourceId, environmentId },
          selectedEnvironmentDataSourceName,
        });
      },
      clearEnvironmentDataSources: () => set({ environmentDataSources: [], dataSources: [] }),
    }),
    {
      name: 'data-sources-storage',
    },
  ),
);

export const useDataSourceActions = () => {
  const { setEnvironmentDataSources } = useEnvironmentDataSourcesStore();
  const router = useRouter();

  const refetchEnvironmentDataSources = async () => {
    try {
      const response = await fetch('/api/data-sources');
      const data = (await response.json()) as { success: boolean; environmentDataSources: EnvironmentDataSource[] };

      if (data.success) {
        setEnvironmentDataSources(data.environmentDataSources);

        if (!data.environmentDataSources?.length) {
          router.push(DATA_SOURCE_CONNECTION_ROUTE);
        }
      }
    } catch (error) {
      console.error('Failed to fetch data sources:', error);
    }
  };

  return {
    refetchEnvironmentDataSources,
  };
};
