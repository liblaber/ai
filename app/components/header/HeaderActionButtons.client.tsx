'use client';
import { useStore } from '@nanostores/react';
import { toast } from 'sonner';
import useViewport from '~/lib/hooks';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';
import { useEnvironmentDataSourcesStore } from '~/lib/stores/environmentDataSources';
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
import { AlertTriangle, Check, ChevronDown, CodeXml, MessageCircle, Rocket, Settings } from 'lucide-react';
import { getDataSourceUrl } from '~/components/@settings/utils/data-sources';
import { useDeploymentMethodsStore } from '~/lib/stores/deploymentMethods';

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

interface DeploymentProviderInfo {
  id: string;
  name: string;
  description: string;
  requiredCredentials: string[];
  enabled: boolean;
}

type DeploymentTypeId = 'netlify' | 'aws' | 'vercel';

export function HeaderActionButtons() {
  const devMode = useStore(workbenchStore.devMode);
  const { showChat } = useStore(chatStore);
  const { website } = useStore(websiteStore);
  const { environmentDataSources, selectedEnvironmentDataSource } = useEnvironmentDataSourcesStore();
  const { providers, environmentDeploymentMethods } = useDeploymentMethodsStore();
  const isSmallViewport = useViewport(1024);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDeploymentTypeOpen, setIsDeploymentTypeOpen] = useState(false);
  const [selectedDeploymentType, setSelectedDeploymentType] = useState<DeploymentTypeId>('netlify');
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentChatId = useStore(chatId);
  const chatDescription = useStore(description);
  const [modalMode, setModalMode] = useState<'publish' | 'settings' | 'initializing'>('publish');
  const [hasNetlifyToken, setHasNetlifyToken] = useState(false);
  const [isPublishingDisabled, setIsPublishingDisabled] = useState(false);
  const [deploymentTypesConfig, setDeploymentTypesConfig] = useState<DeploymentProviderInfo[]>([]);

  // we want to disable sqlite deployments since we do not support remote sqlite nor do we copy the source file yet
  const currentDataSource = environmentDataSources.find(
    ({ environmentId, dataSourceId }) =>
      environmentId === selectedEnvironmentDataSource.environmentId &&
      dataSourceId === selectedEnvironmentDataSource.dataSourceId,
  );

  useEffect(() => {
    async function loadDeploymentData() {
      try {
        // Load providers only (deployment methods are loaded via DataLoader)

        // Check legacy Netlify token for backward compatibility
        const response = await fetch('/api/websites/config');

        if (response.ok) {
          const data = (await response.json()) as WebsitesConfigResponse;
          setHasNetlifyToken(data.netlify.enabled);
        }
      } catch (error) {
        console.error('Failed to load deployment data:', error);
      }
    }

    loadDeploymentData();

    async function checkPublishingCapability() {
      if (!currentDataSource || !currentDataSource.dataSourceId || !currentDataSource.environmentId) {
        setIsPublishingDisabled(true);
      } else {
        const url = await getDataSourceUrl(currentDataSource.dataSourceId, currentDataSource.environmentId);
        setIsPublishingDisabled(url.startsWith('sqlite'));
      }
    }
    checkPublishingCapability();
  }, []);

  useEffect(() => {
    if (currentChatId) {
      fetchWebsite(currentChatId);
    }
  }, [currentChatId]);

  // Update deployment types configuration based on available providers and deployment methods
  useEffect(() => {
    if (providers.length === 0) {
      return;
    }

    const currentEnvironmentId = selectedEnvironmentDataSource.environmentId;
    const availableDeploymentMethods = environmentDeploymentMethods.filter(
      (method) => method.environmentId === currentEnvironmentId,
    );

    const updatedConfig = providers.map((provider) => {
      const isEnabled = availableDeploymentMethods.some((method) => method.provider === provider.id);

      return {
        id: provider.id,
        name: provider.name,
        description: provider.description,
        requiredCredentials: provider.requiredCredentials,
        enabled: isEnabled,
      };
    });

    setDeploymentTypesConfig(updatedConfig);

    // If the currently selected deployment type is not enabled, switch to the first enabled one
    const firstEnabled = updatedConfig.find((type) => type.enabled);

    if (firstEnabled && !updatedConfig.find((type) => type.id === selectedDeploymentType)?.enabled) {
      setSelectedDeploymentType(firstEnabled.id as DeploymentTypeId);
    }
  }, [
    providers,
    environmentDeploymentMethods,
    selectedEnvironmentDataSource.environmentId,
    hasNetlifyToken,
    selectedDeploymentType,
  ]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setIsDeploymentTypeOpen(false);
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
      formData.append('deploymentType', selectedDeploymentType);
      formData.append('zipFile', zipBlob, 'project.zip');
      formData.append('environmentId', selectedEnvironmentDataSource.environmentId || '');

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

                const deploymentTypeName =
                  deploymentTypesConfig.find((t) => t.id === selectedDeploymentType)?.name || selectedDeploymentType;
                toast.success(
                  <div>
                    Deployed successfully to {deploymentTypeName}!{' '}
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
    if (deploymentTypesConfig.length === 0) {
      return (
        <div className="w-64 p-4 text-sm text-gray-700 dark:text-gray-300">
          <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-500">
            <Settings className="w-4 h-4" />
            Loading...
          </div>
          <p className="text-xs text-gray-500">Loading deployment options...</p>
        </div>
      );
    }

    if (!deploymentTypesConfig.length) {
      return (
        <div className="w-64 p-4 text-sm text-gray-700 dark:text-gray-300">
          <div className="flex items-center gap-2 mb-2 text-yellow-600 dark:text-yellow-500">
            <AlertTriangle className="w-4 h-4" />
            Setup Required
          </div>
          <p className="mb-2">To publish your site, you need to set up deployment methods first.</p>
          <p className="text-xs text-gray-500">
            Go to Settings → Deployment Methods to configure your deployment credentials.
          </p>
        </div>
      );
    }

    return (
      <>
        {/* Deployment Type Selector */}
        <div className="relative">
          <button
            onClick={() => setIsDeploymentTypeOpen(!isDeploymentTypeOpen)}
            className="w-full px-4 py-2 text-left text-sm bg-white dark:bg-[#111111] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span>
                {deploymentTypesConfig.find((t) => t.id === selectedDeploymentType)?.name || 'Select Provider'}
              </span>
            </div>
            <ChevronDown className="w-4 h-4" />
          </button>

          {isDeploymentTypeOpen && (
            <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-[#111111] rounded-md shadow-lg border border-[#E5E5E5] dark:border-[#2A2A2A] z-50 max-h-48 overflow-y-auto">
              {deploymentTypesConfig.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setSelectedDeploymentType(type.id as DeploymentTypeId);
                    setIsDeploymentTypeOpen(false);
                  }}
                  disabled={!type.enabled}
                  className={classNames('w-full px-4 py-2 text-left text-sm flex items-center justify-between', {
                    'bg-white dark:bg-[#111111] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800':
                      type.enabled,
                    'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed': !type.enabled,
                  })}
                >
                  <div className="flex items-center gap-2">
                    <div className="text-left">
                      <div className="font-medium">{type.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{type.description}</div>
                      {!type.enabled && (
                        <div className="text-xs text-orange-500 dark:text-orange-400">Not configured</div>
                      )}
                    </div>
                  </div>
                  {selectedDeploymentType === type.id && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-2" />

        <button
          onClick={handlePublishClick}
          disabled={isPublishingDisabled}
          className={classNames(
            'w-full px-4 py-2 text-left text-sm bg-white dark:bg-[#111111] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2',
            {
              'opacity-50 cursor-not-allowed': isPublishingDisabled,
              'hover:bg-gray-100 dark:hover:bg-gray-800': !isPublishingDisabled,
            },
          )}
          title={
            isPublishingDisabled
              ? 'SQLite database publishing is not supported'
              : !deploymentTypesConfig.find((t) => t.id === selectedDeploymentType)?.enabled
                ? 'Selected deployment type is not configured'
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
              active={!isPublishingDisabled}
              disabled={isPublishingDisabled}
              title={
                isPublishingDisabled ? 'SQLite database publishing is not supported' : 'Publish your site to the web'
              }
              onClick={() => !isPublishingDisabled && setIsDropdownOpen(!isDropdownOpen)}
              className={classNames(
                'px-4 flex items-center gap-2 bg-accent-500 dark:bg-accent-500 hover:bg-accent-800 dark:hover:bg-accent-800 text-white dark:text-gray-900',
                {
                  'opacity-50 grayscale': isPublishingDisabled,
                },
              )}
            >
              Publish
            </Button>
          </div>
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-[#111111] rounded-md shadow-lg border border-[#E5E5E5] dark:border-[#2A2A2A] z-50">
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
