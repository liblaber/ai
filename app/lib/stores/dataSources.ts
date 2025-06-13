import { create } from 'zustand';
import { useFetcher, useNavigate } from '@remix-run/react';
import { useEffect } from 'react';
import { persist } from 'zustand/middleware';
import { DATA_SOURCE_CONNECTION_ROUTE } from '~/routes/data-source-connection';

interface DataSource {
  id: string;
  name: string;
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
  const dataSourcesFetcher = useFetcher<{ success: boolean; dataSources: any[] }>();
  const { setDataSources } = useDataSourcesStore();
  const navigate = useNavigate();

  const refetchDataSources = () => {
    dataSourcesFetcher.load('/api/data-sources');
  };

  useEffect(() => {
    if (dataSourcesFetcher.data?.success) {
      setDataSources(dataSourcesFetcher.data.dataSources);
    }
  }, [dataSourcesFetcher.data]);

  useEffect(() => {
    if (dataSourcesFetcher.data?.success && !dataSourcesFetcher.data?.dataSources?.length) {
      navigate(DATA_SOURCE_CONNECTION_ROUTE);
    }
  }, [dataSourcesFetcher.data]);

  return {
    refetchDataSources,
  };
};
