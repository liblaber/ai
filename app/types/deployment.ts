export interface DeploymentPlugin {
  id: string;
  name: string;
  description: string;
  icon: string;
  theme: {
    primary: string;
    background: string;
    hover: string;
    dark: {
      primary: string;
      background: string;
      hover: string;
    };
  };
  isEnabled: () => Promise<boolean>;
  deploy: (params: DeploymentParams) => Promise<DeploymentResult>;
}

export interface DeploymentParams {
  chatId: string;
  siteId?: string;
  websiteId?: string;
  description?: string;
  zipFile: File;
  onProgress: (progress: DeploymentProgress) => void;
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
    site: {
      id: string;
      name: string;
      url: string;
      chatId: string;
    };
    website?: {
      id: string;
      siteId: string;
      siteName: string;
      siteUrl: string;
      chatId: string;
    };
  };
}

export interface DeploymentResult {
  success: boolean;
  error?: string;
  data?: {
    deploy: {
      id: string;
      state: string;
      url: string;
    };
    site: {
      id: string;
      name: string;
      url: string;
      chatId: string;
    };
    website?: {
      id: string;
      siteId: string;
      siteName: string;
      siteUrl: string;
      chatId: string;
    };
  };
}
