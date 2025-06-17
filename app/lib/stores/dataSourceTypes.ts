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
  fetchTypes: () => Promise<void>;
}

export const useDataSourceTypesStore = create<DataSourceTypesState>()((set) => ({
  types: [],
  isLoading: false,
  error: null,
  setTypes: (types) => set({ types }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  fetchTypes: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/data-sources/types');
      const types = (await response.json()) as DataSourceType[];
      set({ types, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch data source types',
        isLoading: false,
      });
    }
  },
}));
