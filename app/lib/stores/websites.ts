import { create } from 'zustand';
import type { Website } from '~/lib/services/websiteService';

interface WebsitesStore {
  websites: Website[];
  setWebsites: (websites: Website[]) => void;
  addWebsite: (website: Website) => void;
  updateWebsite: (id: string, updates: Partial<Website>) => void;
  removeWebsite: (id: string) => void;
}

export const useWebsitesStore = create<WebsitesStore>((set, get) => ({
  websites: [],
  setWebsites: (websites) => set({ websites }),
  addWebsite: (website) => {
    const current = get().websites;
    set({ websites: [...current, website] });
  },
  updateWebsite: (id, updates) => {
    const current = get().websites;
    const updated = current.map((env) => (env.id === id ? { ...env, ...updates } : env));
    set({ websites: updated });
  },
  removeWebsite: (id) => {
    const current = get().websites;
    const filtered = current.filter((env) => env.id !== id);
    set({ websites: filtered });
  },
}));
