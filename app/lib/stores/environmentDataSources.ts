import { create } from 'zustand';
import { useRouter } from 'next/navigation';
import { persist } from 'zustand/middleware';
import { DATA_SOURCE_CONNECTION_ROUTE } from '~/lib/constants/routes';
import type { DataSourceType } from '@liblab/data-access/utils/types';

// TODO: @skos we could reassign the prisma types in lib/ to a variable and import here as a type
export interface EnvironmentVariable {
  id: string;
  key: string;
  value: string;
  description: string | null;
  // TODO: @skos the type should be EnvironmentVariableType (but can't import directly from prisma)
  type: any;
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
    updatedAt: Date;
  };
  dataSourceProperties: [
    {
      type: any;
      environmentVariables: EnvironmentVariable[];
    },
  ];
  // TODO: @skos this should be DataSourcePropertyType (but can't import from prisma directly)
}

interface EnvironmentDataSourcesStore {
  environmentDataSources: EnvironmentDataSource[];
  selectedEnvironmentDataSource: { dataSourceId: string | null; environmentId: string | null };
  setEnvironmentDataSources: (environmentDataSources: EnvironmentDataSource[]) => void;
  setSelectedEnvironmentDataSource: (dataSourceId: string | null, environmentId: string | null) => void;
  clearEnvironmentDataSources: () => void;
}

export const useEnvironmentDataSourcesStore = create<EnvironmentDataSourcesStore>()(
  persist(
    (set, getState) => ({
      environmentDataSources: [],
      selectedEnvironmentDataSource: { dataSourceId: null, environmentId: null },
      setEnvironmentDataSources: (environmentDataSources) => {
        set({ environmentDataSources });

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
      setSelectedEnvironmentDataSource: (dataSourceId: string | null, environmentId: string | null) =>
        set({ selectedEnvironmentDataSource: { dataSourceId, environmentId } }),
      clearEnvironmentDataSources: () => set({ environmentDataSources: [] }),
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
