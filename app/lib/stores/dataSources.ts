import { create } from 'zustand';
import { useRouter } from 'next/navigation';
import { persist } from 'zustand/middleware';
import { DATA_SOURCE_CONNECTION_ROUTE } from '~/lib/constants/routes';
import { DataSourceType } from '@liblab/data-access/utils/types';

interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  connectionString: string;
  createdAt: string;
  updatedAt: string;
}

interface DataSourcesState {
  dataSources: DataSource[];
  selectedDataSourceId: string | null;
  setDataSources: (dataSources: DataSource[]) => void;
  setSelectedDataSourceId: (id: string | null) => void;
  clearDataSources: () => void;
}

export const useDataSourcesStore = create<DataSourcesState>()(
  persist(
    (set, getState) => ({
      dataSources: [],
      selectedDataSourceId: null,
      setDataSources: (dataSources) => {
        set({ dataSources });

        if (dataSources.length === 0) {
          getState().setSelectedDataSourceId(null);
          return;
        }

        const selectedDataSourceId = getState().selectedDataSourceId;

        if (selectedDataSourceId && dataSources.some((dataSource) => dataSource.id === selectedDataSourceId)) {
          return;
        }

        getState().setSelectedDataSourceId(dataSources[0].id);
      },
      setSelectedDataSourceId: (id) => set({ selectedDataSourceId: id }),
      clearDataSources: () => set({ dataSources: [] }),
    }),
    {
      name: 'data-sources-storage',
    },
  ),
);

export const useDataSourceActions = () => {
  const { setDataSources } = useDataSourcesStore();
  const router = useRouter();

  const refetchDataSources = async () => {
    try {
      const response = await fetch('/api/data-sources');
      const data = (await response.json()) as { success: boolean; dataSources: DataSource[] };

      if (data.success) {
        setDataSources(data.dataSources);

        if (!data.dataSources?.length) {
          router.push(DATA_SOURCE_CONNECTION_ROUTE);
        }
      }
    } catch (error) {
      console.error('Failed to fetch data sources:', error);
    }
  };

  return {
    refetchDataSources,
  };
};
