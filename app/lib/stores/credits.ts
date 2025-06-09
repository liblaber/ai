import { create } from 'zustand';

interface CreditsState {
  usedCredits: number;
  maxCreditsPerDay: number;
  isLoading: boolean;
  error: string | null;
  fetchCredits: () => Promise<void>;
  setCredits: (credits: { usedCredits: number; maxCreditsPerDay: number }) => void;
}

interface CreditsResponse {
  credits: number;
  maxCredits: number;
}

export const useCreditsStore = create<CreditsState>((set) => ({
  usedCredits: 0,
  maxCreditsPerDay: 0,
  isLoading: false,
  error: null,

  fetchCredits: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/user/credits');

      if (!response.ok) {
        throw new Error('Failed to fetch credits');
      }

      const data = (await response.json()) as CreditsResponse;

      set({
        usedCredits: data.credits,
        maxCreditsPerDay: data.maxCredits,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An error occurred',
        isLoading: false,
      });
    }
  },

  incrementCredits: () => {
    set((state) => ({
      usedCredits: state.usedCredits + 1,
    }));
  },

  setCredits: ({ usedCredits, maxCreditsPerDay }) =>
    set(() => ({
      usedCredits,
      maxCreditsPerDay,
    })),
}));
