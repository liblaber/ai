import { create } from 'zustand';
import type { EnvironmentVariable } from '@prisma/client';

export interface EnvironmentVariableWithDetails extends EnvironmentVariable {
  environment: {
    id: string;
    name: string;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
}

interface EnvironmentVariablesState {
  environmentVariables: EnvironmentVariableWithDetails[];
  isLoading: boolean;
  error: string | null;
  setEnvironmentVariables: (environmentVariables: EnvironmentVariableWithDetails[]) => void;
  addEnvironmentVariable: (environmentVariable: EnvironmentVariableWithDetails) => void;
  updateEnvironmentVariable: (id: string, updates: Partial<EnvironmentVariableWithDetails>) => void;
  removeEnvironmentVariable: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  clearEnvironmentVariables: () => void;
}

export const useEnvironmentVariablesStore = create<EnvironmentVariablesState>((set, get) => ({
  environmentVariables: [],
  isLoading: false,
  error: null,

  setEnvironmentVariables: (environmentVariables) =>
    set({
      environmentVariables,
      error: null,
    }),

  addEnvironmentVariable: (environmentVariable) => {
    const current = get().environmentVariables;
    set({
      environmentVariables: [...current, environmentVariable],
      error: null,
    });
  },

  updateEnvironmentVariable: (id, updates) => {
    const current = get().environmentVariables;
    const updated = current.map((envVar) => (envVar.id === id ? { ...envVar, ...updates } : envVar));
    set({
      environmentVariables: updated,
      error: null,
    });
  },

  removeEnvironmentVariable: (id) => {
    const current = get().environmentVariables;
    const filtered = current.filter((envVar) => envVar.id !== id);
    set({
      environmentVariables: filtered,
      error: null,
    });
  },

  setLoading: (isLoading) =>
    set({
      isLoading,
    }),

  setError: (error) =>
    set({
      error,
    }),

  clearError: () =>
    set({
      error: null,
    }),

  clearEnvironmentVariables: () =>
    set({
      environmentVariables: [],
      error: null,
    }),
}));
