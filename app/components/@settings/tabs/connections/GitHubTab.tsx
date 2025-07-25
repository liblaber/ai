import { motion } from 'framer-motion';
import React, { Suspense, useEffect, useState } from 'react';
import { classNames } from '~/utils/classNames';
import { toast } from 'sonner';
import Cookies from 'js-cookie';
import { LockSlash } from 'iconsax-reactjs';
import { useGitStore } from '~/lib/stores/git';

interface GitHubUserResponse {
  login: string;
  avatar_url: string;
  html_url: string;
  name: string;
  bio: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  public_gists: number;
}

interface GitHubRepoInfo {
  name: string;
  full_name: string;
  html_url: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  default_branch: string;
  updated_at: string;
  languages_url: string;
}

interface GitHubOrganization {
  login: string;
  avatar_url: string;
  html_url: string;
}

interface GitHubEvent {
  id: string;
  type: string;
  repo: {
    name: string;
  };
  created_at: string;
}

interface GitHubLanguageStats {
  [language: string]: number;
}

interface GitHubStats {
  repos: GitHubRepoInfo[];
  totalStars: number;
  totalForks: number;
  organizations: GitHubOrganization[];
  recentActivity: GitHubEvent[];
  languages: GitHubLanguageStats;
  totalGists: number;
}

interface GitHubConnection {
  user: GitHubUserResponse | null;
  token: string;
  tokenType: 'classic' | 'fine-grained';
  stats?: GitHubStats;
}

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full min-h-[400px]">
    <div className="flex flex-col items-center gap-3">
      <div className="i-ph:spinner-gap w-8 h-8 animate-spin text-gray-500 dark:text-gray-400" />
      <span className="text-sm text-gray-500 dark:text-gray-400">Loading GitHub connection...</span>
    </div>
  </div>
);

export default function GitHubTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [connection, setConnection] = useState<GitHubConnection>({
    user: null,
    token: '',
    tokenType: 'classic',
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFetchingStats, setIsFetchingStats] = useState(false);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const remoteChangesPullInterval = useGitStore((state) => state.remoteChangesPullIntervalSec);
  const setRemoteChangesPullInterval = useGitStore((state) => state.setRemoteChangesPullInterval);
  const [pullChangesIntervalLocal, setPullChangesIntervalLocal] = useState(remoteChangesPullInterval);

  const handleIntervalChange = (value: string) => {
    setPullChangesIntervalLocal(Number(value));
  };

  const handleIntervalBlur = (value: string) => {
    const numValue = Number(value);

    if (numValue < 5) {
      toast.error('Minimum interval is 5 seconds');
      setPullChangesIntervalLocal(remoteChangesPullInterval);

      return;
    }

    setRemoteChangesPullInterval(numValue);
  };

  const fetchGithubUser = async (token: string) => {
    try {
      setIsConnecting(true);

      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Invalid token or unauthorized');
      }

      const data = (await response.json()) as GitHubUserResponse;
      const newConnection: GitHubConnection = {
        user: data,
        token,
        tokenType: connection.tokenType,
      };

      localStorage.setItem('github_connection', JSON.stringify(newConnection));
      Cookies.set('githubToken', token);
      Cookies.set('githubUsername', data.login);
      Cookies.set('git:github.com', JSON.stringify({ username: token, password: 'x-oauth-basic' }));

      setConnection(newConnection);

      await fetchGitHubStats(token);

      toast.success('Successfully connected to GitHub');
    } catch {
      toast.error('Failed to connect to GitHub');
      setConnection({ user: null, token: '', tokenType: 'classic' });
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchGitHubStats = async (token: string) => {
    try {
      setIsFetchingStats(true);

      const reposResponse = await fetch(
        'https://api.github.com/user/repos?sort=updated&per_page=10&affiliation=owner,organization_member,collaborator',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!reposResponse.ok) {
        throw new Error('Failed to fetch repositories');
      }

      const repos = (await reposResponse.json()) as GitHubRepoInfo[];

      const orgsResponse = await fetch('https://api.github.com/user/orgs', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!orgsResponse.ok) {
        throw new Error('Failed to fetch organizations');
      }

      const organizations = (await orgsResponse.json()) as GitHubOrganization[];

      const eventsResponse = await fetch('https://api.github.com/users/' + connection.user?.login + '/events/public', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!eventsResponse.ok) {
        throw new Error('Failed to fetch events');
      }

      const recentActivity = ((await eventsResponse.json()) as GitHubEvent[]).slice(0, 5);

      const languagePromises = repos.map((repo) =>
        fetch(repo.languages_url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).then((res) => res.json() as Promise<Record<string, number>>),
      );

      const repoLanguages = await Promise.all(languagePromises);
      const languages: GitHubLanguageStats = {};

      repoLanguages.forEach((repoLang) => {
        Object.entries(repoLang).forEach(([lang, bytes]) => {
          languages[lang] = (languages[lang] || 0) + bytes;
        });
      });

      const totalStars = repos.reduce((acc, repo) => acc + repo.stargazers_count, 0);
      const totalForks = repos.reduce((acc, repo) => acc + repo.forks_count, 0);
      const totalGists = connection.user?.public_gists || 0;

      setConnection((prev) => ({
        ...prev,
        stats: {
          repos,
          totalStars,
          totalForks,
          organizations,
          recentActivity,
          languages,
          totalGists,
        },
      }));
    } catch {
      toast.error('Failed to fetch GitHub statistics');
    } finally {
      setIsFetchingStats(false);
    }
  };

  useEffect(() => {
    const savedConnection = localStorage.getItem('github_connection');

    if (savedConnection) {
      const parsed = JSON.parse(savedConnection);

      if (!parsed.tokenType) {
        parsed.tokenType = 'classic';
      }

      setConnection(parsed);

      if (parsed.user && parsed.token) {
        fetchGitHubStats(parsed.token);
      }
    } else if (import.meta.env.VITE_GITHUB_ACCESS_TOKEN) {
      fetchGithubUser(import.meta.env.VITE_GITHUB_ACCESS_TOKEN);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!connection) {
      return;
    }

    const token = connection.token;
    const data = connection.user;
    Cookies.set('githubToken', token);
    Cookies.set('git:github.com', JSON.stringify({ username: token, password: 'x-oauth-basic' }));

    if (data) {
      Cookies.set('githubUsername', data.login);
    }
  }, [connection]);

  const handleConnect = async (event: React.FormEvent) => {
    event.preventDefault();
    await fetchGithubUser(connection.token);
  };

  const handleDisconnect = () => {
    localStorage.removeItem('github_connection');
    setConnection({ user: null, token: '', tokenType: 'classic' });
    toast.success('Disconnected from GitHub');
  };

  if (isLoading || isConnecting || isFetchingStats) {
    return <LoadingFallback />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        className="flex items-center gap-2 mb-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="i-ph:github-logo w-5 h-5 text-accent-500" />
        <h2 className="text-lg font-medium text-liblab-elements-textPrimary">GitHub Settings</h2>
      </motion.div>
      <p className="text-sm text-liblab-elements-textSecondary mb-6">
        Manage your GitHub connection and repository settings
      </p>

      <div className="grid grid-cols-1 gap-4">
        <Suspense fallback={<LoadingFallback />}>
          {/* GitHub Connection */}
          <motion.div
            className="bg-[#FFFFFF] dark:bg-[#0A0A0A] rounded-lg border border-[#E5E5E5] dark:border-[#1A1A1A]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-2">
                <div className="i-ph:github-logo w-5 h-5 text-liblab-elements-textPrimary" />
                <h3 className="text-base font-medium text-liblab-elements-textPrimary">GitHub Connection</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-liblab-elements-textSecondary mb-2">Token Type</label>
                  <select
                    value={connection.tokenType}
                    onChange={(e) =>
                      setConnection((prev) => ({ ...prev, tokenType: e.target.value as 'classic' | 'fine-grained' }))
                    }
                    disabled={isConnecting || !!connection.user}
                    className={classNames(
                      'w-full px-3 py-2 rounded-lg text-sm',
                      'bg-[#F8F8F8] dark:bg-[#1A1A1A]',
                      'border border-[#E5E5E5] dark:border-[#333333]',
                      'text-liblab-elements-textPrimary',
                      'focus:outline-none focus:ring-1 focus:ring-accent-500',
                      'disabled:opacity-50',
                    )}
                  >
                    <option value="classic">Personal Access Token (Classic)</option>
                    <option value="fine-grained">Fine-grained Token</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-liblab-elements-textSecondary mb-2">
                    {connection.tokenType === 'classic' ? 'Personal Access Token' : 'Fine-grained Token'}
                  </label>
                  <input
                    type="password"
                    value={connection.token}
                    onChange={(e) => setConnection((prev) => ({ ...prev, token: e.target.value }))}
                    disabled={isConnecting || !!connection.user}
                    placeholder={`Enter your GitHub ${
                      connection.tokenType === 'classic' ? 'personal access token' : 'fine-grained token'
                    }`}
                    className={classNames(
                      'w-full px-3 py-2 rounded-lg text-sm',
                      'bg-[#F8F8F8] dark:bg-[#1A1A1A]',
                      'border border-[#E5E5E5] dark:border-[#333333]',
                      'text-liblab-elements-textPrimary placeholder-liblab-elements-textTertiary',
                      'focus:outline-none focus:ring-1 focus:ring-accent-500',
                      'disabled:opacity-50',
                    )}
                  />
                  <div className="mt-2 text-sm text-liblab-elements-textSecondary">
                    <a
                      href={`https://github.com/settings/${connection.tokenType === 'classic' ? 'tokens/new' : 'personal-access-tokens/new'}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-500 hover:underline inline-flex items-center gap-1"
                    >
                      Get your token
                      <div className="i-ph:arrow-square-out w-10 h-5" />
                    </a>
                    <div className="mt-2">
                      <p className="font-medium">Required scopes:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        {connection.tokenType === 'classic' ? (
                          <>
                            <li>repo</li>
                            <li>read:org</li>
                            <li>read:user</li>
                          </>
                        ) : (
                          <>
                            <li>Repository access</li>
                            <li>Organization access</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!connection.user ? (
                  <button
                    onClick={handleConnect}
                    disabled={isConnecting || !connection.token}
                    className={classNames(
                      'px-4 py-2 rounded-lg text-sm flex items-center gap-2',
                      'bg-accent-500 text-white',
                      'hover:bg-accent-600',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                  >
                    {isConnecting ? (
                      <>
                        <div className="i-ph:spinner-gap animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <div className="i-ph:plug-charging w-4 h-4" />
                        Connect
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleDisconnect}
                    className={classNames(
                      'px-4 py-2 rounded-lg text-sm flex items-center gap-2',
                      'bg-red-500 text-white',
                      'hover:bg-red-600',
                    )}
                  >
                    <LockSlash variant="Bold" className="w-4 h-4" />
                    Disconnect
                  </button>
                )}

                {connection.user && (
                  <span className="text-sm text-liblab-elements-textSecondary flex items-center gap-1">
                    <div className="i-ph:check-circle w-4 h-4" />
                    Connected to GitHub
                  </span>
                )}
              </div>

              {connection.user && connection.stats && (
                <div className="mt-6 border-t border-[#E5E5E5] dark:border-[#1A1A1A] pt-6">
                  <button onClick={() => setIsStatsExpanded(!isStatsExpanded)} className="w-full bg-transparent">
                    <div className="flex items-center gap-4">
                      <img
                        src={connection.user.avatar_url}
                        alt={connection.user.login}
                        className="w-16 h-16 rounded-full"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium text-liblab-elements-textPrimary">
                            {connection.user.name || connection.user.login}
                          </h3>
                          <div
                            className={classNames(
                              'i-ph:caret-down w-4 h-4 text-liblab-elements-textSecondary transition-transform',
                              isStatsExpanded ? 'rotate-180' : '',
                            )}
                          />
                        </div>
                        {connection.user.bio && (
                          <p className="text-sm text-start text-liblab-elements-textSecondary">{connection.user.bio}</p>
                        )}
                        <div className="flex gap-4 mt-2 text-sm text-liblab-elements-textSecondary">
                          <span className="flex items-center gap-1">
                            <div className="i-ph:users w-4 h-4" />
                            {connection.user.followers} followers
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="i-ph:book-bookmark w-4 h-4" />
                            {connection.user.public_repos} public repos
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="i-ph:star w-4 h-4" />
                            {connection.stats.totalStars} stars
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="i-ph:git-fork w-4 h-4" />
                            {connection.stats.totalForks} forks
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>

                  {isStatsExpanded && (
                    <div className="pt-4">
                      {connection.stats.organizations.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-sm font-medium text-liblab-elements-textPrimary mb-3">Organizations</h4>
                          <div className="flex flex-wrap gap-3">
                            {connection.stats.organizations.map((org) => (
                              <a
                                key={org.login}
                                href={org.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-2 rounded-lg bg-[#F8F8F8] dark:bg-[#1A1A1A] hover:bg-[#F0F0F0] dark:hover:bg-[#252525] transition-colors"
                              >
                                <img src={org.avatar_url} alt={org.login} className="w-6 h-6 rounded-md" />
                                <span className="text-sm text-liblab-elements-textPrimary">{org.login}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Languages Section */}
                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-liblab-elements-textPrimary mb-3">Top Languages</h4>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(connection.stats.languages)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 5)
                            .map(([language]) => (
                              <span
                                key={language}
                                className="px-3 py-1 text-xs rounded-full bg-accent-500/10 text-accent-500 dark:bg-accent-500/20"
                              >
                                {language}
                              </span>
                            ))}
                        </div>
                      </div>

                      {/* Recent Activity Section */}
                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-liblab-elements-textPrimary mb-3">Recent Activity</h4>
                        <div className="space-y-3">
                          {connection.stats.recentActivity.map((event) => (
                            <div key={event.id} className="p-3 rounded-lg bg-[#F8F8F8] dark:bg-[#1A1A1A] text-sm">
                              <div className="flex items-center gap-2 text-liblab-elements-textPrimary">
                                <div className="i-ph:git-commit w-4 h-4 text-liblab-elements-textSecondary" />
                                <span className="font-medium">{event.type.replace('Event', '')}</span>
                                <span>on</span>
                                <a
                                  href={`https://github.com/${event.repo.name}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-accent-500 hover:underline"
                                >
                                  {event.repo.name}
                                </a>
                              </div>
                              <div className="mt-1 text-xs text-liblab-elements-textSecondary">
                                {new Date(event.created_at).toLocaleDateString()} at{' '}
                                {new Date(event.created_at).toLocaleTimeString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Additional Stats */}
                      <div className="grid grid-cols-4 gap-4 mb-6">
                        <div className="p-4 rounded-lg bg-[#F8F8F8] dark:bg-[#1A1A1A]">
                          <div className="text-sm text-liblab-elements-textSecondary">Member Since</div>
                          <div className="text-lg font-medium text-liblab-elements-textPrimary">
                            {new Date(connection.user.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-[#F8F8F8] dark:bg-[#1A1A1A]">
                          <div className="text-sm text-liblab-elements-textSecondary">Public Gists</div>
                          <div className="text-lg font-medium text-liblab-elements-textPrimary">
                            {connection.stats.totalGists}
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-[#F8F8F8] dark:bg-[#1A1A1A]">
                          <div className="text-sm text-liblab-elements-textSecondary">Organizations</div>
                          <div className="text-lg font-medium text-liblab-elements-textPrimary">
                            {connection.stats.organizations.length}
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-[#F8F8F8] dark:bg-[#1A1A1A]">
                          <div className="text-sm text-liblab-elements-textSecondary">Languages</div>
                          <div className="text-lg font-medium text-liblab-elements-textPrimary">
                            {Object.keys(connection.stats.languages).length}
                          </div>
                        </div>
                      </div>

                      {/* Repositories Section */}
                      <h4 className="text-sm font-medium text-liblab-elements-textPrimary mb-3">Recent Repositories</h4>
                      <div className="space-y-3">
                        {connection.stats.repos.map((repo) => (
                          <a
                            key={repo.full_name}
                            href={repo.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-3 rounded-lg bg-[#F8F8F8] dark:bg-[#1A1A1A] hover:bg-[#F0F0F0] dark:hover:bg-[#252525] transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="text-sm font-medium text-liblab-elements-textPrimary flex items-center gap-2">
                                  <div className="i-ph:git-repository w-4 h-4 text-liblab-elements-textSecondary" />
                                  {repo.name}
                                </h5>
                                {repo.description && (
                                  <p className="text-xs text-liblab-elements-textSecondary mt-1">{repo.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2 text-xs text-liblab-elements-textSecondary">
                                  <span className="flex items-center gap-1">
                                    <div className="i-ph:git-branch w-3 h-3" />
                                    {repo.default_branch}
                                  </span>
                                  <span>•</span>
                                  <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-liblab-elements-textSecondary">
                                <span className="flex items-center gap-1">
                                  <div className="i-ph:star w-3 h-3" />
                                  {repo.stargazers_count}
                                </span>
                                <span className="flex items-center gap-1">
                                  <div className="i-ph:git-fork w-3 h-3" />
                                  {repo.forks_count}
                                </span>
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Remote Changes Pull Interval Settings */}
              <div className="mt-6 border-t border-[#E5E5E5] dark:border-[#1A1A1A] pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="i-ph:clock w-5 h-5 text-liblab-elements-textPrimary" />
                  <h3 className="text-base font-medium text-liblab-elements-textPrimary">Remote Changes Settings</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-liblab-elements-textSecondary mb-2">
                      Pull Interval (seconds)
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        min="5"
                        step="1"
                        value={pullChangesIntervalLocal}
                        onChange={(e) => handleIntervalChange(e.target.value)}
                        onBlur={(e) => handleIntervalBlur(e.target.value)}
                        className={classNames(
                          'w-24 px-3 py-2 rounded-lg text-sm',
                          'bg-[#F8F8F8] dark:bg-[#1A1A1A]',
                          'border border-[#E5E5E5] dark:border-[#333333]',
                          'text-liblab-elements-textPrimary',
                          'focus:outline-none focus:ring-1 focus:ring-accent-500',
                        )}
                      />
                      <span className="text-sm text-liblab-elements-textSecondary">seconds</span>
                    </div>
                    <p className="mt-2 text-xs text-liblab-elements-textSecondary">
                      How often to check for remote changes. Minimum 5 seconds.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </Suspense>
      </div>
    </div>
  );
}
