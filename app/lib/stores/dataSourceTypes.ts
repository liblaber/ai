import { create } from 'zustand';

export interface DataSourceType {
  value: string;
  label: string;
  connectionStringFormat: string;
  available: boolean;
}

interface DataSourceTypesState {
  types: DataSourceType[];
  isLoading: boolean;
  error: string | null;
  setTypes: (types: DataSourceType[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useDataSourceTypesStore = create<DataSourceTypesState>()((set) => ({
  types: [],
  isLoading: false,
  error: null,
  setTypes: (types) => set({ types }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
