import { create } from 'zustand';
import type { EnvironmentWithRelations } from '~/lib/services/environmentService';

interface EnvironmentsStore {
  environments: EnvironmentWithRelations[];
  setEnvironments: (environments: EnvironmentWithRelations[]) => void;
  addEnvironment: (environment: EnvironmentWithRelations) => void;
  updateEnvironment: (id: string, updates: Partial<EnvironmentWithRelations>) => void;
  removeEnvironment: (id: string) => void;
}

export const useEnvironmentsStore = create<EnvironmentsStore>((set, get) => ({
  environments: [],
  setEnvironments: (environments) => set({ environments }),
  addEnvironment: (environment) => {
    const current = get().environments;
    set({ environments: [...current, environment] });
  },
  updateEnvironment: (id, updates) => {
    const current = get().environments;
    const updated = current.map((env) => (env.id === id ? { ...env, ...updates } : env));
    set({ environments: updated });
  },
  removeEnvironment: (id) => {
    const current = get().environments;
    const filtered = current.filter((env) => env.id !== id);
    set({ environments: filtered });
  },
}));
