import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { chatId, getLocalStorage } from '~/lib/persistence';
import { classNames } from '~/utils/classNames';
import type { GitHubUserResponse } from '~/types/GitHub';
import { workbenchStore } from '~/lib/stores/workbench';
import { formatSize } from '~/utils/formatSize';
import type { File, FileMap } from '~/lib/stores/files';
import { Octokit } from '@octokit/rest';
import { openSettingsPanel } from '~/lib/stores/settings';
import { CloseCircle } from 'iconsax-reactjs';
import { useGitStore } from '~/lib/stores/git';
import { Button } from '~/components/ui/Button';
import { CheckCircle, Copy, Github, User, GitBranch, Loader2 } from 'lucide-react';

interface PushToGitHubDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPush: (repoName: string, username?: string, token?: string, isPrivate?: boolean) => Promise<string>;
}

export function PushToGitHubDialog({ isOpen, onClose, onPush }: PushToGitHubDialogProps) {
  const [repoName, setRepoName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<GitHubUserResponse | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [createdRepoUrl, setCreatedRepoUrl] = useState('');
  const [pushedFiles, setPushedFiles] = useState<{ path: string; size: number }[]>([]);
  const currentChatId = chatId.get();
  const gitMetadata = useGitStore((state) => (currentChatId ? state.getGitMetadata(currentChatId) : null));

  // Load GitHub connection on mount
  useEffect(() => {
    if (isOpen) {
      const connection = getLocalStorage('github_connection');

      if (connection?.user && connection?.token) {
        setUser(connection.user);
      }
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const connection = getLocalStorage('github_connection');

    if (!connection?.token || !connection?.user) {
      toast.error('Please connect your GitHub account in Settings > Connections first');
      return;
    }

    if (!repoName.trim()) {
      toast.error('Repository name is required');
      return;
    }

    setIsLoading(true);

    try {
      // Check if repository exists first
      const octokit = new Octokit({ auth: connection.token });

      try {
        await octokit.repos.get({
          owner: connection.user.login,
          repo: repoName,
        });

        // If we get here, the repo exists
        const confirmOverwrite = window.confirm(
          `Repository "${repoName}" already exists. Do you want to update it? This will add or modify files in the repository.`,
        );

        if (!confirmOverwrite) {
          setIsLoading(false);
          return;
        }
      } catch (error) {
        // 404 means repo doesn't exist, which is what we want for new repos
        if (error instanceof Error && 'status' in error && error.status !== 404) {
          throw error;
        }
      }

      const repoUrl = await onPush(repoName, connection.user.login, connection.token, isPrivate);
      setCreatedRepoUrl(repoUrl);

      // Get list of pushed files
      const files = workbenchStore.getFileMap();
      const filesList = Object.entries(files as FileMap)
        .filter(([, dirent]) => dirent?.type === 'file' && !dirent.isBinary)
        .map(([path, dirent]) => ({
          path,
          size: new TextEncoder().encode((dirent as File).content || '').length,
        }));

      setPushedFiles(filesList);
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('Error pushing to GitHub:', error);
      toast.error('Failed to push to GitHub. Please check your repository name and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setRepoName('');
    setIsPrivate(false);
    setShowSuccessDialog(false);
    setCreatedRepoUrl('');
    onClose();
  };

  const handleConnectGitHub = () => {
    openSettingsPanel('github');
    handleClose();
  };

  const handleRepoNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/[^a-zA-Z0-9._-]/g, '');
    setRepoName(cleaned);
  };

  const handleDisconnect = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentChatId) {
      return;
    }

    useGitStore.getState().disconnectRepository(currentChatId);
    toast.success('Repository disconnected');
  };

  const handleReconnect = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    if (!currentChatId) {
      return;
    }

    useGitStore.getState().reconnectRepository(currentChatId);
    toast.success('Repository reconnected');
  };

  // Success Dialog
  if (showSuccessDialog) {
    return (
      <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]" />
          <div className="fixed inset-0 flex items-center justify-center z-[9999]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-[90vw] md:w-[600px] max-h-[85vh] overflow-y-auto"
            >
              <Dialog.Content className="relative bg-white dark:bg-[#1E1E1E] rounded-lg border border-[#E5E5E5] dark:border-[#333333] shadow-xl">
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-500">
                      <CheckCircle className="w-5 h-5" />
                      <h3 className="text-lg font-medium">Successfully pushed to GitHub</h3>
                    </div>
                  </div>

                  <div className="bg-depth-2 dark:bg-depth-3 rounded-lg p-3 text-left">
                    <p className="text-xs text-secondary dark:text-secondary-dark mb-2">Repository URL</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm  px-3 py-2 rounded border border-depth-3 dark:border-depth-3-dark text-primary dark:text-primary-dark font-mono">
                        {createdRepoUrl}
                      </code>
                      <motion.button
                        onClick={() => {
                          navigator.clipboard.writeText(createdRepoUrl);
                          toast.success('URL copied to clipboard');
                        }}
                        className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Copy className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>

                  <div className="bg-depth-2 dark:bg-depth-3 rounded-lg p-3">
                    <p className="text-xs text-secondary dark:text-secondary-dark mb-2">
                      Pushed Files ({pushedFiles.length})
                    </p>
                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                      {pushedFiles.map((file) => (
                        <div
                          key={file.path}
                          className="flex items-center justify-between py-1 text-sm text-primary dark:text-primary-dark"
                        >
                          <span className="font-mono truncate flex-1">{file.path}</span>
                          <span className="text-xs text-secondary dark:text-secondary-dark ml-2">
                            {formatSize(file.size)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <motion.a
                      href={createdRepoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-lg bg-accent-500 text-primary hover:bg-accent-600 text-sm inline-flex items-center gap-2"
                    >
                      <Github className="w-4 h-4" />
                      View Repository
                    </motion.a>
                    <motion.button
                      onClick={() => {
                        navigator.clipboard.writeText(createdRepoUrl);
                        toast.success('URL copied to clipboard');
                      }}
                      className="px-4 py-2 rounded-lg bg-[#F5F5F5] dark:bg-[#1A1A1A] text-gray-600 dark:text-gray-400 hover:bg-[#E5E5E5] dark:hover:bg-[#252525] text-sm inline-flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copy URL
                    </motion.button>
                    <motion.button
                      onClick={handleClose}
                      className="px-4 py-2 rounded-lg bg-[#F5F5F5] dark:bg-[#1A1A1A] text-gray-600 dark:text-gray-400 hover:bg-[#E5E5E5] dark:hover:bg-[#252525] text-sm"
                    >
                      Close
                    </motion.button>
                  </div>
                </div>
                <div className="absolute top-4 right-4 z-[99999]">
                  <CloseCircle
                    variant="Bold"
                    className="w-6 h-6 text-gray-500 dark:text-white hover:text-gray-700 dark:hover:text-gray-400 transition-colors cursor-pointer"
                    onClick={handleClose}
                  />
                </div>
              </Dialog.Content>
            </motion.div>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  if (!user) {
    return (
      <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]" />
          <div className="fixed inset-0 flex items-center justify-center z-[9999]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-[90vw] md:w-[500px]"
            >
              <Dialog.Content className="relative bg-white dark:bg-[#0A0A0A] rounded-lg p-6 border border-[#E5E5E5] dark:border-[#1A1A1A] shadow-xl">
                <div className="text-center space-y-4">
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="mx-auto w-12 h-12 rounded-xl bg-depth-3 flex items-center justify-center text-accent-500"
                  >
                    <Github className="w-6 h-6" />
                  </motion.div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">GitHub Connection Required</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Please connect your GitHub account first.</p>
                  <motion.button
                    className="px-4 py-2 rounded-lg bg-accent-500 text-gray-900 text-sm hover:bg-accent-600 inline-flex items-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleConnectGitHub}
                  >
                    <User />
                    Connect GitHub
                  </motion.button>
                </div>
                <Dialog.Close asChild>
                  <div className="absolute top-4 right-4 z-[99999]">
                    <CloseCircle
                      variant="Bold"
                      className="w-6 h-6 text-gray-500 dark:text-white hover:text-gray-700 dark:hover:text-gray-400 transition-colors cursor-pointer"
                      onClick={handleClose}
                    />
                  </div>
                </Dialog.Close>
              </Dialog.Content>
            </motion.div>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  // If repository is already connected, show connected state
  if (gitMetadata?.gitUrl && !gitMetadata.isDisconnected) {
    return (
      <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]" />
          <div className="fixed inset-0 flex items-center justify-center z-[9999]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-[90vw] md:w-[500px]"
            >
              <Dialog.Content className="relative bg-white dark:bg-[#0A0A0A] rounded-lg border border-[#E5E5E5] dark:border-[#1A1A1A] shadow-xl">
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1 }}
                      className="w-10 h-10 rounded-xl bg-depth-3 flex items-center justify-center text-accent-500"
                    >
                      <GitBranch className="w-5 h-5" />
                    </motion.div>
                    <div>
                      <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
                        Connected Repository
                      </Dialog.Title>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Your code is connected to a GitHub repository
                      </p>
                    </div>
                    <Dialog.Close asChild>
                      <div className="absolute top-4 right-4 z-[99999]">
                        <CloseCircle
                          variant="Bold"
                          className="w-6 h-6 text-gray-500 dark:text-white hover:text-gray-700 dark:hover:text-gray-400 transition-colors cursor-pointer"
                          onClick={handleClose}
                        />
                      </div>
                    </Dialog.Close>
                  </div>

                  <div className="flex items-center gap-3 mb-6 p-3 bg-depth-2 dark:bg-depth-3 rounded-lg">
                    <img src={user?.avatar_url} alt={user?.login} className="w-10 h-10 rounded-full" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name || user?.login}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">@{user?.login}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <a
                      href={gitMetadata.gitUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-depth-2 dark:bg-depth-3 rounded-lg p-4 hover:bg-depth-3 dark:hover:bg-depth-3 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Github className="w-4 h-4 text-accent-500" />
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            {gitMetadata.gitUrl.split('/').pop()?.replace('.git', '')}
                          </h4>
                        </div>
                        <Button type="button" size="sm" variant="secondary" onClick={handleDisconnect}>
                          Disconnect
                        </Button>
                      </div>
                    </a>
                  </div>
                </div>
              </Dialog.Content>
            </motion.div>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]" />
        <div className="fixed inset-0 flex items-center justify-center z-[9999]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-[90vw] md:w-[500px]"
          >
            <Dialog.Content className="relative bg-white dark:bg-[#0A0A0A] rounded-lg border border-[#E5E5E5] dark:border-[#1A1A1A] shadow-xl">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="w-10 h-10 rounded-xl bg-depth-3 flex items-center justify-center text-accent-500"
                  >
                    <GitBranch className="w-5 h-5" />
                  </motion.div>
                  <div>
                    <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
                      Push to GitHub
                    </Dialog.Title>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Push your code to a new or existing GitHub repository
                    </p>
                  </div>
                  <Dialog.Close asChild>
                    <div className="absolute top-4 right-4 z-[99999]">
                      <CloseCircle
                        variant="Bold"
                        className="w-6 h-6 text-gray-500 dark:text-white hover:text-gray-700 dark:hover:text-gray-400 transition-colors cursor-pointer"
                        onClick={handleClose}
                      />
                    </div>
                  </Dialog.Close>
                </div>

                <div className="flex items-center gap-3 mb-6 p-3 bg-depth-2 dark:bg-depth-3 rounded-lg">
                  <img src={user.avatar_url} alt={user.login} className="w-10 h-10 rounded-full" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name || user.login}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">@{user.login}</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {gitMetadata?.gitUrl && (
                    <div className="space-y-2">
                      <label className="text-sm text-gray-600 dark:text-gray-400">
                        Previously Connected Repository
                      </label>
                      <div className="space-y-2">
                        <motion.button
                          type="button"
                          onClick={handleReconnect}
                          className="w-full p-3 text-left rounded-lg bg-depth-2 dark:bg-depth-3 hover:bg-depth-3 dark:hover:bg-depth-3 transition-colors group"
                        >
                          <div className="flex items-center justify-between text-white hover:text-accent-500">
                            <div className="flex items-center gap-2">
                              <Github className="w-4 h-4" />
                              <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-accent-500">
                                {gitMetadata.gitUrl.split('/').pop()?.replace('.git', '')}
                              </span>
                            </div>
                            <Button type="button" onClick={handleReconnect} variant="primary">
                              Connect
                            </Button>
                          </div>
                        </motion.button>
                      </div>
                    </div>
                  )}

                  {gitMetadata?.gitUrl && (
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[#E5E5E5] dark:border-[#1A1A1A]"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="px-4 text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-[#0A0A0A]">
                          or
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="repoName" className="text-sm text-gray-600 dark:text-gray-400">
                      Create new or existing repository
                    </label>
                    <input
                      id="repoName"
                      type="text"
                      value={repoName}
                      onChange={handleRepoNameChange}
                      placeholder="my-awesome-project"
                      className="w-full px-4 py-2 rounded-lg bg-depth-2 dark:bg-depth-3 border border-[#E5E5E5] dark:border-[#1A1A1A] text-gray-900 dark:text-white placeholder-gray-400"
                      required
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="private"
                        checked={isPrivate}
                        onChange={(e) => setIsPrivate(e.target.checked)}
                        className="rounded border-[#E5E5E5] dark:border-[#1A1A1A] text-accent-500 focus:ring-accent-500 dark:bg-[#0A0A0A]"
                      />
                      <label htmlFor="private" className="text-sm text-gray-600 dark:text-gray-400">
                        Make repository private
                      </label>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isLoading}
                      className={classNames(
                        'w-full inline-flex items-center justify-center gap-2',
                        isLoading ? 'opacity-50 cursor-not-allowed' : '',
                      )}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>Connect and Push to GitHub</>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </Dialog.Content>
          </motion.div>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
