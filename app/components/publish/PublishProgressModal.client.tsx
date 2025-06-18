import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@nanostores/react';
import { useFetcher } from '@remix-run/react';
import { websiteStore } from '~/lib/stores/websiteStore';

interface PluginMetadata {
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
  isEnabled: boolean;
  isDeletable: boolean;
}

interface UploadResponse {
  success?: boolean;
  plugin?: PluginMetadata;
  error?: string;
}

interface DeleteResponse {
  success?: boolean;
  error?: string;
}

interface PublishProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancel: () => void;
  mode: 'publish' | 'settings';
  onPublishClick: (pluginId: string) => void;
}

// Constants
const PUBLISH_STEPS = [
  { title: 'Initializing', description: 'Preparing deployment environment' },
  { title: 'Site Setup', description: 'Creating or updating site' },
  { title: 'File Preparation', description: 'Preparing project files' },
  { title: 'Dependencies', description: 'Installing project dependencies' },
  { title: 'Configuration', description: 'Configuring deployment settings' },
  { title: 'Deployment', description: 'Deploying your site' },
];

// Main Component
export function PublishProgressModal({ isOpen, onClose, onCancel, mode, onPublishClick }: PublishProgressModalProps) {
  // State
  const { website, deploymentProgress, deploymentLogs } = useStore(websiteStore);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [plugins, setPlugins] = useState<PluginMetadata[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadFetcher = useFetcher<UploadResponse>();
  const deleteFetcher = useFetcher<DeleteResponse>();
  const pluginsFetcher = useFetcher<{ plugins: PluginMetadata[] }>();

  useEffect(() => {
    const loadPlugins = async () => {
      try {
        const response = await fetch('/api/deployment-plugins');

        if (!response.ok) {
          throw new Error('Failed to load plugins');
        }

        const data = (await response.json()) as { plugins: PluginMetadata[] };
        setPlugins(data.plugins);

        if (data.plugins.length > 0) {
          setSelectedPlugin(data.plugins[0].id);
        }
      } catch (error) {
        console.error('Error loading plugins:', error);
      }
    };
    loadPlugins();
  }, []);

  // Reload plugins when deletion is successful
  useEffect(() => {
    if (deleteFetcher.state === 'idle' && deleteFetcher.data?.success) {
      pluginsFetcher.load('/api/deployment-plugins');
    }
  }, [deleteFetcher.state, deleteFetcher.data]);

  // Update plugins when pluginsFetcher data changes
  useEffect(() => {
    if (pluginsFetcher.data?.plugins) {
      setPlugins(pluginsFetcher.data.plugins);

      // If the currently selected plugin was deleted, select the first available one
      if (!pluginsFetcher.data.plugins.find((p) => p.id === selectedPlugin)) {
        setSelectedPlugin(pluginsFetcher.data.plugins[0]?.id || null);
      }
    }
  }, [pluginsFetcher.data]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && deploymentProgress?.status !== 'in_progress') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keyup', handleEscape);
    }

    return () => {
      document.removeEventListener('keyup', handleEscape);
    };
  }, [isOpen, deploymentProgress?.status]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [deploymentLogs]);

  useEffect(() => {
    if (uploadFetcher.data) {
      if (uploadFetcher.data.success && uploadFetcher.data.plugin) {
        const newPlugin: PluginMetadata = uploadFetcher.data.plugin;
        setPlugins((prev) => [...prev, newPlugin]);
        setUploadError(null);
      } else if (uploadFetcher.data.error) {
        setUploadError(uploadFetcher.data.error);
      }
    }
  }, [uploadFetcher.data]);

  // Handlers
  const handleClose = () => {
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleCopyLink = () => {
    if (deploymentProgress?.data?.deploy?.url) {
      navigator.clipboard.writeText(deploymentProgress.data.deploy.url);
      setIsCopying(true);
      setTimeout(() => {
        setIsCopying(false);
      }, 2000);
    }
  };

  const handlePluginUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.name.endsWith('.zip')) {
      setUploadError('Please upload a .zip file');
      return;
    }

    setUploadError(null);

    const formData = new FormData();
    formData.append('plugin', file);

    uploadFetcher.submit(formData, {
      method: 'POST',
      action: '/api/plugins/upload',
      encType: 'multipart/form-data',
    });
  };

  const handleDeletePlugin = (pluginId: string) => {
    if (window.confirm('Are you sure you want to delete this plugin?')) {
      const formData = new FormData();
      formData.append('pluginId', pluginId);
      deleteFetcher.submit(formData, {
        method: 'DELETE',
        action: '/api/deployment-plugins',
      });
    }
  };

  if (!isOpen) {
    return null;
  }

  // Render Functions
  const renderProgressSteps = () => {
    return (
      <div className="mt-6">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Deployment Progress</div>
        <div className="space-y-4">
          {PUBLISH_STEPS.map((step, index) => {
            const currentStep = deploymentProgress?.step || 0;
            const isCompleted = currentStep > index;
            const isCurrent = currentStep === index + 1;

            return (
              <div
                key={index}
                className={`flex items-start ${
                  isCompleted
                    ? 'text-green-600 dark:text-green-500'
                    : isCurrent
                      ? 'text-blue-600 dark:text-blue-500'
                      : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <div className="i-ph:check-circle w-5 h-5" />
                  ) : isCurrent ? (
                    <div className="i-ph:circle-notch-bold animate-spin w-5 h-5" />
                  ) : (
                    <div className="i-ph:circle w-5 h-5" />
                  )}
                </div>
                <div className="ml-3">
                  <div className="text-sm font-medium">{step.title}</div>
                  <div className="text-xs">{step.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderProgressBar = () => {
    const progress = deploymentProgress ? (deploymentProgress.step / deploymentProgress.totalSteps) * 100 : 0;

    return (
      <div className="mt-6">
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 dark:text-blue-500 bg-blue-200 dark:bg-blue-900">
                Progress
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold inline-block text-blue-600 dark:text-blue-500">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200 dark:bg-blue-900">
            <div
              style={{ width: `${progress}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 dark:bg-blue-600 transition-all duration-500"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderSettingsView = () => {
    return (
      <div className="mt-6">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Site Settings</div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Site Name</label>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{website?.siteName || 'Not set'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Site URL</label>
            <div className="mt-1 flex items-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">{website?.siteUrl || 'Not set'}</div>
              {website?.siteUrl && (
                <button
                  onClick={handleCopyLink}
                  className="ml-2 text-blue-600 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-400"
                >
                  {isCopying ? <div className="i-ph:check w-4 h-4" /> : <div className="i-ph:copy w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPluginSelection = () => {
    return (
      <div className="mt-6">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Select Deployment Target</div>
        <div className="space-y-4">
          {plugins.map((plugin) => (
            <div
              key={plugin.id}
              className={`w-full p-4 rounded-lg border bg-transparent ${
                selectedPlugin === plugin.id
                  ? `border-${plugin.theme.primary} bg-${plugin.theme.background} dark:bg-${plugin.theme.dark.background}`
                  : `border-gray-200 dark:border-gray-700 hover:border-${plugin.theme.hover} dark:hover:border-${plugin.theme.dark.hover}`
              }`}
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setSelectedPlugin(plugin.id);
                    onPublishClick(plugin.id);
                  }}
                  className="bg-transparent flex-1 flex items-center"
                >
                  <div
                    className={`w-8 h-8 flex items-center justify-center ${
                      selectedPlugin === plugin.id ? `text-${plugin.theme.primary}` : `text-${plugin.theme.primary}`
                    }`}
                  >
                    <div className={plugin.icon} />
                  </div>
                  <div className="ml-4 text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{plugin.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{plugin.description}</div>
                  </div>
                </button>
                {plugin.isDeletable && (
                  <button
                    onClick={() => handleDeletePlugin(plugin.id)}
                    className="bg-transparent ml-4 p-2 text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400"
                    title="Delete plugin"
                  >
                    <div className="i-ph:trash w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Plugin Upload Section */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Install Custom Plugin</div>
            <div className="flex items-center space-x-4">
              <label className="flex-1">
                <div className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="flex items-center justify-center">
                    <div className="i-ph:upload w-5 h-5 mr-2" />
                    {uploadFetcher.state === 'submitting' ? 'Installing...' : 'Upload Plugin (.zip)'}
                  </div>
                </div>
                <input
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={handlePluginUpload}
                  disabled={uploadFetcher.state === 'submitting'}
                />
              </label>
            </div>
            {uploadError && <div className="mt-2 text-sm text-red-600 dark:text-red-400">{uploadError}</div>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" />

        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
          &#8203;
        </span>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="relative inline-block transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle"
        >
          <div>
            <div className="mt-3 text-center sm:mt-5">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
                {mode === 'publish' ? 'Publish Your Site' : 'Site Settings'}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {mode === 'publish'
                    ? 'Choose a deployment target and publish your site'
                    : 'View and manage your site settings'}
                </p>
              </div>
            </div>

            {(() => {
              if (mode === 'publish') {
                if (deploymentProgress?.status === 'in_progress') {
                  return (
                    <>
                      {renderProgressSteps()}
                      {renderProgressBar()}
                      <div className="mt-6">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Deployment Logs</div>
                        <div className="bg-white dark:bg-gray-800 rounded-md p-4 h-64 overflow-y-auto font-mono text-sm border border-gray-200 dark:border-gray-700">
                          {deploymentLogs.map((log, index) => (
                            <div key={index} className="text-gray-600 dark:text-gray-400">
                              {log}
                            </div>
                          ))}
                          <div ref={logsEndRef} />
                        </div>
                      </div>
                      <div className="flex justify-end mt-6">
                        <button
                          type="button"
                          className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900"
                          onClick={onCancel}
                        >
                          Cancel Publishing
                        </button>
                      </div>
                    </>
                  );
                }

                if (deploymentProgress?.status === 'success') {
                  return renderSettingsView();
                }

                return renderPluginSelection();
              } else {
                // Settings mode
                return renderSettingsView();
              }
            })()}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
