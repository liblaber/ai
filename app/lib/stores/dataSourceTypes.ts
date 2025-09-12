import type { DataSourceDescriptor } from '@liblab/data-access/utils/types';
import { create } from 'zustand';

interface DataSourceTypesState {
  dataSourceTypes: DataSourceDescriptor[];
  isLoading: boolean;
  error: string | null;
  setDataSourceTypes: (types: DataSourceDescriptor[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useDataSourceTypesStore = create<DataSourceTypesState>()((set) => ({
  dataSourceTypes: [],
  isLoading: false,
  error: null,
  setDataSourceTypes: (types) => set({ dataSourceTypes: types }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
