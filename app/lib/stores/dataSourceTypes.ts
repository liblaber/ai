import { create } from 'zustand';
import type { Plugin } from '~/lib/plugins/types';

export interface DataSourceType extends Plugin {
  value: string;
  label: string;
  connectionStringFormat: string;
  available: boolean;
}

interface DataSourceTypesState {
  dataSourceTypes: DataSourceType[];
  isLoading: boolean;
  error: string | null;
  setDataSourceTypes: (types: DataSourceType[]) => void;
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
