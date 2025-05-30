export interface NetlifySite {
  id: string;
  name: string;
  url: string;
  admin_url: string;
  build_settings: {
    provider: string;
    repo_url: string;
    cmd: string;
  };
  published_deploy: {
    published_at: string;
    deploy_time: number;
  };
}

export interface NetlifyUser {
  id: string;
  slug: string;
  email: string;
  full_name: string;
  avatar_url: string;
}

export interface NetlifyStats {
  sites: NetlifySite[];
  totalSites: number;
}

export interface NetlifyConnection {
  user: NetlifyUser | null;
  token: string;
  stats?: NetlifyStats;
}

export interface NetlifySiteInfo {
  id: string;
  name: string;
  url: string;
  chatId: string;
}
