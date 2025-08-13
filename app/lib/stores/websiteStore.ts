import { atom } from 'nanostores';
import type { NetlifySiteInfo } from '~/types/netlify';

export interface Website {
  id: string;
  siteId: string | null;
  siteName: string | null;
  siteUrl: string | null;
}

interface WebsiteResponse {
  website: Website;
  error?: string;
}

export interface DeploymentProgress {
  step: number;
  totalSteps: number;
  message: string;
  status: 'in_progress' | 'success' | 'error';
  data?: {
    deploy: {
      id: string;
      state: string;
      url: string;
    };
    site: NetlifySiteInfo;
    website?: Website;
  };
}

interface WebsiteState {
  website: Website | null;
  isLoading: boolean;
  error: string | null;
  deploymentProgress: DeploymentProgress | null;
  deploymentLogs: string[];
  errorLogs: string[];
}

const initialState: WebsiteState = {
  website: null,
  isLoading: false,
  error: null,
  deploymentProgress: null,
  deploymentLogs: [],
  errorLogs: [],
};

export const websiteStore = atom<WebsiteState>(initialState);

export const setWebsite = (website: Website | null) => {
  websiteStore.set({ ...websiteStore.get(), website });
};

export const addErrorLogs = (...logs: string[]) => {
  const state = websiteStore.get();
  websiteStore.set({
    ...state,
    errorLogs: [...state.errorLogs, ...logs],
  });
};

export const setLoading = (isLoading: boolean) => {
  websiteStore.set({ ...websiteStore.get(), isLoading });
};

export const setError = (error: string | null) => {
  websiteStore.set({ ...websiteStore.get(), error });
};

export const setDeploymentProgress = (progress: DeploymentProgress | null) => {
  websiteStore.set({ ...websiteStore.get(), deploymentProgress: progress });
};

export const addDeploymentLog = (log: string) => {
  const state = websiteStore.get();
  websiteStore.set({
    ...state,
    deploymentLogs: [...state.deploymentLogs, log],
  });
};

export const clearDeploymentLogs = () => {
  websiteStore.set({ ...websiteStore.get(), deploymentLogs: [] });
  websiteStore.set({ ...websiteStore.get(), errorLogs: [] });
};

export const fetchWebsite = async (chatId: string) => {
  if (!chatId) {
    return;
  }

  try {
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/chats/${chatId}/website`);

    if (response.ok) {
      const data = (await response.json()) as WebsiteResponse;

      if (data.website) {
        setWebsite(data.website);
      }
    } else {
      setError('Failed to fetch website');
    }
  } catch (error) {
    setError(error instanceof Error ? error.message : 'Failed to fetch website');
  } finally {
    setLoading(false);
  }
};
