import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { StopCircle } from 'iconsax-reactjs';
import { useStore } from '@nanostores/react';
import { websiteStore } from '~/lib/stores/websiteStore';
import { Check, Copy, ExternalLink, Rocket, X } from 'lucide-react';

interface PublishProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancel: () => void;
  mode: 'publish' | 'settings' | 'initializing';
  onPublishClick: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement>;
  deploymentMethod?: string;
}

// Helper function to get deployment-specific steps
const getDeploymentSteps = (deploymentMethod?: string) => {
  const baseSteps = [
    { title: 'Initializing', description: 'Preparing deployment environment' },
    { title: 'File Preparation', description: 'Preparing project files' },
    { title: 'Dependencies', description: 'Installing project dependencies' },
    { title: 'Configuration', description: 'Configuring deployment settings' },
    { title: 'Deployment', description: 'Deploying application' },
  ];

  switch (deploymentMethod?.toLowerCase()) {
    case 'netlify':
      return [
        { title: 'Initializing', description: 'Preparing deployment environment' },
        { title: 'Website Setup', description: 'Creating or updating Netlify site' },
        { title: 'File Preparation', description: 'Preparing project files' },
        { title: 'Dependencies', description: 'Installing project dependencies' },
        { title: 'Configuration', description: 'Configuring Netlify settings' },
        { title: 'Deployment', description: 'Deploying to Netlify' },
      ];
    case 'vercel':
      return [
        { title: 'Initializing', description: 'Preparing deployment environment' },
        { title: 'Project Setup', description: 'Creating or updating Vercel project' },
        { title: 'File Preparation', description: 'Preparing project files' },
        { title: 'Dependencies', description: 'Installing project dependencies' },
        { title: 'Configuration', description: 'Configuring Vercel settings' },
        { title: 'Deployment', description: 'Deploying to Vercel' },
      ];
    case 'aws':
      return [
        { title: 'Initializing', description: 'Preparing deployment environment' },
        { title: 'Infrastructure Setup', description: 'Setting up AWS infrastructure' },
        { title: 'File Preparation', description: 'Preparing project files' },
        { title: 'Dependencies', description: 'Installing project dependencies' },
        { title: 'Configuration', description: 'Configuring AWS settings' },
        { title: 'Deployment', description: 'Deploying to AWS' },
      ];
    default:
      return baseSteps;
  }
};

// Main Component
export function PublishProgressModal({
  isOpen,
  onClose,
  onCancel,
  mode,
  onPublishClick,
  buttonRef,
  deploymentMethod,
}: PublishProgressModalProps) {
  // State
  const { website, isLoading, deploymentProgress } = useStore(websiteStore);
  const [isCopying, setIsCopying] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });

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

  // Calculate popup position based on button position
  useEffect(() => {
    if (isOpen && buttonRef?.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      setPopupPosition({
        top: buttonRect.bottom + 8, // 8px gap below button
        left: buttonRect.left - 240, // Center the 480px popup relative to button
      });
    }
  }, [isOpen, buttonRef]);

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && deploymentProgress?.status !== 'in_progress') {
        const target = event.target as Element;
        const modal = document.querySelector('[data-modal="publish-progress"]');

        if (modal && !modal.contains(target)) {
          handleClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, deploymentProgress?.status]);

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

  if (!isOpen) {
    return null;
  }

  const renderCurrentStep = () => {
    if (!deploymentProgress) {
      return null;
    }

    const currentStepIndex = deploymentProgress.step - 1;
    const publishSteps = getDeploymentSteps(deploymentMethod);
    const currentStep = publishSteps[currentStepIndex];

    return (
      <div className="flex items-center gap-3">
        <div>
          <div className="text-md text-white">{currentStep?.description || 'Please wait...'}</div>
        </div>
      </div>
    );
  };

  const renderProgressBar = () => {
    if (!deploymentProgress) {
      return null;
    }

    return (
      <div className="w-full">
        <div className="w-full bg-gray-700 rounded-full h-1.5">
          <div
            className="bg-accent-500 h-1.5 rounded-full transition-all duration-300"
            style={{
              width: `${((deploymentProgress.step - 1) / deploymentProgress.totalSteps) * 100}%`,
            }}
          />
        </div>
      </div>
    );
  };

  const renderSettingsView = () => {
    if (!website) {
      return null;
    }

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={website.siteUrl || ''}
              className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300"
            />
            {website.siteUrl && (
              <a
                href={website.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
              >
                View
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>

          {(website as any).slug && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`/apps/${(website as any).slug}`}
                className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300"
              />
              <a
                href={`/apps/${(website as any).slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-700 border border-blue-200 dark:border-blue-700"
              >
                App Viewer
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onPublishClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
          >
            <Rocket className="w-4 h-4" />
            Publish New Version
          </button>

          {website.siteUrl && (
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
            >
              {isCopying ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Link
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) {
    return null;
  }

  return (
    <motion.div
      className="fixed z-[100]"
      style={{
        top: popupPosition.top,
        left: popupPosition.left,
      }}
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <div
        data-modal="publish-progress"
        className="flex flex-col items-start gap-4 p-6 rounded-[15px] border border-white/8 bg-[#1E2125] shadow-[0_8px_16px_0_rgba(0,0,0,0.45)]"
        style={{
          width: '480px',
        }}
      >
        {(() => {
          if (mode === 'initializing' || (isLoading && mode === 'settings' && !website)) {
            return (
              <div className="flex items-center gap-3 w-full">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-accent-500 border-t-transparent" />
                <div className="text-sm text-white">Initializing...</div>
              </div>
            );
          }

          if (mode === 'publish') {
            if (deploymentProgress?.status === 'in_progress') {
              return (
                <div className="w-full space-y-4">
                  {renderCurrentStep()}
                  {renderProgressBar()}
                  <div className="flex justify-start">
                    <button
                      onClick={onCancel}
                      className="flex items-center gap-2 px-4 py-2 bg-[#1E2125] hover:bg-[#2A2D32] text-white text-sm rounded-md transition-colors border border-white/8 cursor-pointer"
                    >
                      <StopCircle variant="Bold" className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              );
            }

            if (deploymentProgress?.status === 'success') {
              return (
                <div className="w-full space-y-3">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-white">Published Successfully!</span>
                  </div>

                  {/* Direct Link */}
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400">Direct Link</label>
                    <input
                      type="text"
                      readOnly
                      value={website?.siteUrl || ''}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
                    />
                    {website?.siteUrl && (
                      <div className="flex gap-2">
                        <a
                          href={website.siteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm transition-colors"
                        >
                          View
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <button
                          onClick={handleCopyLink}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm transition-colors"
                        >
                          {isCopying ? (
                            <>
                              <Check className="w-3 h-3" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              Copy Link
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* App Viewer Link */}
                  {(website as any)?.slug && (
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400">App Viewer</label>
                      <input
                        type="text"
                        readOnly
                        value={`/apps/${(website as any).slug}`}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
                      />
                      <div className="flex gap-2">
                        <a
                          href={`/apps/${(website as any).slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors"
                        >
                          App Viewer
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`/apps/${(website as any).slug}`);
                            setIsCopying(true);
                            setTimeout(() => setIsCopying(false), 2000);
                          }}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors"
                        >
                          {isCopying ? (
                            <>
                              <Check className="w-3 h-3" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            if (deploymentProgress?.status === 'error') {
              return (
                <div className="w-full space-y-3">
                  <div className="flex items-center gap-2">
                    <X className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-white">Publishing Failed</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {deploymentProgress.message || 'An error occurred during deployment.'}
                  </div>
                  <button
                    onClick={onPublishClick}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-accent-500 hover:bg-accent-600 text-white rounded-md text-sm transition-colors"
                  >
                    <Rocket className="w-3 h-3" />
                    Try Again
                  </button>
                </div>
              );
            }
          } else {
            // Settings mode
            return renderSettingsView();
          }

          return null;
        })()}
      </div>
    </motion.div>
  );
}
