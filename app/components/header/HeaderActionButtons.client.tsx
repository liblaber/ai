'use client';
import { useStore } from '@nanostores/react';
import { toast } from 'sonner';
import useViewport from '~/lib/hooks';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';
import { useDataSourcesStore } from '~/lib/stores/dataSources';
import {
  addDeploymentLog,
  addErrorLogs,
  clearDeploymentLogs,
  fetchWebsite,
  setDeploymentProgress,
  setLoading,
  setWebsite,
  type Website,
  websiteStore,
} from '~/lib/stores/websiteStore';
import { webcontainer } from '~/lib/webcontainer';
import { classNames } from '~/utils/classNames';
import { path } from '~/utils/path';
import { useEffect, useRef, useState } from 'react';
import { chatId, description } from '~/lib/persistence/useConversationHistory';
import { PublishProgressModal } from '~/components/publish/PublishProgressModal.client';
import JSZip from 'jszip';
import type { NetlifySiteInfo } from '~/types/netlify';
import { AlertTriangle, CodeXml, Lock, MessageCircle, Rocket, Settings } from 'lucide-react';

interface ProgressData {
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

interface WebsiteResponse {
  website: Website;
  error?: string;
}

interface WebsitesConfigResponse {
  netlify: {
    enabled: boolean;
  };
}

interface HeaderActionButtonsProps {}

export function HeaderActionButtons({}: HeaderActionButtonsProps) {
  const devMode = useStore(workbenchStore.devMode);
  const { showChat } = useStore(chatStore);
  const { website } = useStore(websiteStore);
  const { dataSources, selectedDataSourceId } = useDataSourcesStore();
  const isSmallViewport = useViewport(1024);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentChatId = useStore(chatId);
  const chatDescription = useStore(description);
  const [modalMode, setModalMode] = useState<'publish' | 'settings' | 'initializing'>('publish');
  const [hasNetlifyToken, setHasNetlifyToken] = useState(false);

  // we want to disable sqlite deployments since we do not support remote sqlite nor do we copy the source file yet
  const currentDataSource = dataSources.find(({ id }) => id === selectedDataSourceId);
  const isCurrentDataSourceSQLite = currentDataSource?.connectionString?.startsWith('sqlite://') || false;

  useEffect(() => {
    async function checkNetlifyConfig() {
      try {
        const response = await fetch('/api/websites/config');

        if (response.ok) {
          const data = (await response.json()) as WebsitesConfigResponse;
          setHasNetlifyToken(data.netlify.enabled);
        }
      } catch (error) {
        console.error('Failed to check Netlify configuration:', error);
      }
    }

    checkNetlifyConfig();
  }, []);

  useEffect(() => {
    if (currentChatId) {
      fetchWebsite(currentChatId);
    }
  }, [currentChatId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSettings = async () => {
    setIsDropdownOpen(false);
    setIsModalOpen(true);
    setModalMode('settings');

    if (!website) {
      try {
        setLoading(true);

        // Create a new website if it doesn't exist
        const response = await fetch('/api/websites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chatId: currentChatId,
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as WebsiteResponse;
          setWebsite(data.website);
          setDeploymentProgress({
            step: 6,
            totalSteps: 6,
            message: 'Site settings',
            status: 'success',
            data: {
              deploy: {
                id: data.website.siteId || '',
                state: 'ready',
                url: data.website.siteUrl || '',
              },
              site: {
                id: data.website.siteId || '',
                name: data.website.siteName || '',
                url: data.website.siteUrl || '',
                chatId: currentChatId || '',
              },
              website: data.website,
            },
          });
        } else {
          toast.error('Failed to create website');
        }
      } catch (error) {
        console.error('Error creating website:', error);
        toast.error('Failed to create website');
      } finally {
        setLoading(false);
      }
    } else {
      setDeploymentProgress({
        step: 6,
        totalSteps: 6,
        message: 'Site settings',
        status: 'success',
        data: {
          deploy: {
            id: website.siteId || '',
            state: 'ready',
            url: website.siteUrl || '',
          },
          site: {
            id: website.siteId || '',
            name: website.siteName || '',
            url: website.siteUrl || '',
            chatId: currentChatId || '',
          },
          website,
        },
      });
    }
  };

  const startDeployment = async () => {
    // needed to ensure loader shows
    setModalMode('initializing');

    try {
      setDeploymentProgress(null);
      clearDeploymentLogs();

      setIsModalOpen(true);
      setLoading(true);
      abortControllerRef.current = new AbortController();

      const artifact = workbenchStore.firstArtifact;

      if (!artifact) {
        throw new Error('No active project found');
      }

      // Get all files recursively, excluding build and .netlify directories
      const container = await webcontainer();
      const projectPath = '/home/project';

      async function getAllFiles(dirPath: string): Promise<Record<string, string>> {
        const files: Record<string, string> = {};
        const entries = await container.fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);

          // Skip build and .netlify directories
          if (
            entry.isDirectory() &&
            (entry.name === 'build' || entry.name === '.netlify' || entry.name === 'node_modules')
          ) {
            continue;
          }

          if (entry.isFile()) {
            if (entry.name === 'pnpm-lock.yaml') {
              continue;
            }

            const content = await container.fs.readFile(fullPath, 'utf-8');

            // Remove /home/project prefix from the path
            const deployPath = fullPath.replace(projectPath, '');
            files[deployPath] = content;
          } else if (entry.isDirectory()) {
            const subFiles = await getAllFiles(fullPath);
            Object.assign(files, subFiles);
          }
        }

        return files;
      }

      const fileContents = await getAllFiles('');

      // Create a zip file
      const zip = new JSZip();

      for (const [filePath, content] of Object.entries(fileContents)) {
        zip.file(filePath, content);
      }

      // Generate the zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Create FormData to send the zip file
      const formData = new FormData();
      formData.append('siteId', website?.siteId || '');
      formData.append('websiteId', website?.id || '');
      formData.append('chatId', currentChatId || '');
      formData.append('description', chatDescription || '');
      formData.append('zipFile', zipBlob, 'project.zip');

      // Deploy using the API route with zip file
      const response = await fetch('/api/deploy', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      setModalMode('publish');

      if (!response.ok) {
        throw new Error('Failed to start deployment');
      }

      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error('Failed to read response stream');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6)) as ProgressData;
              setDeploymentProgress(data);
              addDeploymentLog(data.message);

              if (data.status === 'success' && data.data?.deploy?.url) {
                // Update the website store with the new deployment info
                if (data.data.website) {
                  setWebsite(data.data.website);
                }

                localStorage.setItem(`netlify-site-${currentChatId}`, data.data.site.id);
                toast.success(
                  <div>
                    Deployed successfully!{' '}
                    <a href={data.data.deploy.url} target="_blank" rel="noopener noreferrer" className="underline">
                      View site
                    </a>
                  </div>,
                );

                // Close the reader when deployment is successful
                await reader.cancel();
                break;
              } else if (data.status === 'error') {
                toast.error(data.message);
                addErrorLogs(data.message);
                // Close the reader when there's an error
                setDeploymentProgress({ ...data, message: '' });
                await reader.cancel();
                break;
              }
            }
          }
        }
      } finally {
        // Ensure reader is closed
        await reader.cancel();
      }
    } catch (error) {
      console.error('Error during deployment:', error);
      toast.error('Failed to deploy website');
      setDeploymentProgress(null);
    } finally {
      setLoading(false);
    }
  };

  // Add cleanup when modal is closed
  const handleModalClose = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsModalOpen(false);
  };

  const handlePublishClick = () => {
    setModalMode('publish');
    startDeployment();
  };

  const renderDropdownContent = () => {
    if (!hasNetlifyToken) {
      return (
        <div className="w-48 p-4 text-sm text-gray-700 dark:text-gray-300">
          <div className="flex items-center gap-2 mb-2 text-yellow-600 dark:text-yellow-500">
            <AlertTriangle className="w-4 h-4" />
            Setup Required
          </div>
          <p className="mb-2">To publish your site, you need to set up your Netlify authentication token first.</p>
          <p className="text-xs text-gray-500">Add NETLIFY_AUTH_TOKEN to your environment variables.</p>
        </div>
      );
    }

    return (
      <>
        <button
          onClick={handlePublishClick}
          disabled={isCurrentDataSourceSQLite}
          className={classNames(
            'w-full px-4 py-2 text-left text-sm bg-white dark:bg-[#111111] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2',
            {
              'opacity-50 cursor-not-allowed': isCurrentDataSourceSQLite,
              'hover:bg-gray-100 dark:hover:bg-gray-800': !isCurrentDataSourceSQLite,
            },
          )}
          title={
            isCurrentDataSourceSQLite
              ? 'SQLite database publishing is not supported'
              : 'Publish new version of your site'
          }
        >
          <Rocket className="w-4 h-4" />
          Publish New Version
        </button>
        <button
          onClick={handleSettings}
          className="w-full px-4 py-2 text-left text-sm bg-white dark:bg-[#111111] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          Website Settings
        </button>
      </>
    );
  };

  return (
    <>
      <div className="flex">
        <div className="relative" ref={dropdownRef}>
          <div className="flex border border-depth-3 rounded-md overflow-hidden mr-2 text-sm">
            <Button
              active={!isCurrentDataSourceSQLite}
              disabled={isCurrentDataSourceSQLite}
              title={
                isCurrentDataSourceSQLite
                  ? 'SQLite database publishing is not supported'
                  : 'Publish your site to the web'
              }
              onClick={() => !isCurrentDataSourceSQLite && setIsDropdownOpen(!isDropdownOpen)}
              className={classNames('px-4 flex items-center gap-2', {
                'opacity-50 grayscale': isCurrentDataSourceSQLite,
              })}
            >
              {isCurrentDataSourceSQLite ? <Lock className="w-4 h-4" /> : <Rocket className="w-4 h-4" />}
              Publish
            </Button>
          </div>
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-[#111111] rounded-md shadow-lg border border-[#E5E5E5] dark:border-[#2A2A2A] z-50">
              {renderDropdownContent()}
            </div>
          )}
        </div>
        <div className="flex border border-depth-3 rounded-md overflow-hidden">
          <Button
            active={showChat}
            disabled={isSmallViewport}
            title={showChat ? 'Hide chat panel' : 'Show chat panel'}
            onClick={() => {
              chatStore.setKey('showChat', !showChat);
            }}
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
          <div className="w-[1px] bg-depth-3" />
          <Button
            active={devMode}
            title={devMode ? 'Exit code view' : 'Enter code view'}
            onClick={() => {
              if (!showChat) {
                chatStore.setKey('showChat', true);
              }

              workbenchStore.currentView.set(!devMode ? 'code' : 'preview');
              workbenchStore.devMode.set(!devMode);
            }}
          >
            <CodeXml className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <PublishProgressModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onCancel={() => {
          abortControllerRef.current?.abort();
          setDeploymentProgress(null);
          clearDeploymentLogs();
          setIsModalOpen(false);
        }}
        mode={modalMode}
        onPublishClick={handlePublishClick}
      />
    </>
  );
}

interface ButtonProps {
  active?: boolean;
  disabled?: boolean;
  children?: any;
  onClick?: VoidFunction;
  className?: string;
  title?: string;
}

function Button({ active = false, disabled = false, children, onClick, className, title }: ButtonProps) {
  return (
    <button
      className={classNames(
        'flex items-center p-1.5',
        {
          'bg-depth-1 text-tertiary hover:text-primary': !active && !disabled,
          'bg-accent/10 text-accent hover:bg-depth-3/10 cursor-pointer': active && !disabled,
          'bg-depth-1 text-alpha-gray-20 dark:text-alpha-white-20 cursor-not-allowed': disabled,
        },
        className,
      )}
      onClick={disabled ? undefined : onClick}
      title={title}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
