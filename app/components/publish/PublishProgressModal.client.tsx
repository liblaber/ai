import { useEffect, useRef, useState } from 'react';
import { classNames } from '~/utils/classNames';
import { motion } from 'framer-motion';
import { CloseCircle } from 'iconsax-reactjs';
import { useStore } from '@nanostores/react';
import { websiteStore } from '~/lib/stores/websiteStore';
import { Check, X, ExternalLink, Rocket, Copy } from 'lucide-react';

interface PublishProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancel: () => void;
  mode: 'publish' | 'settings' | 'initializing';
  onPublishClick: () => void;
}

// Constants
const PUBLISH_STEPS = [
  { title: 'Initializing', description: 'Preparing deployment environment' },
  { title: 'Website Setup', description: 'Creating or updating Netlify site' },
  { title: 'File Preparation', description: 'Preparing project files' },
  { title: 'Dependencies', description: 'Installing project dependencies' },
  { title: 'Configuration', description: 'Configuring deployment settings' },
  { title: 'Deployment', description: 'Deploying to Netlify' },
];

// Main Component
export function PublishProgressModal({ isOpen, onClose, onCancel, mode, onPublishClick }: PublishProgressModalProps) {
  // State
  const { website, isLoading, deploymentProgress, deploymentLogs, errorLogs } = useStore(websiteStore);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [isCopying, setIsCopying] = useState(false);

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

  // Render Functions
  const renderLoadingState = () => (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-accent-500 border-t-transparent mb-4" />
      <div className="text-gray-700 dark:text-gray-300">Initializing...</div>
    </div>
  );

  const renderProgressSteps = () => (
    <div className="grid grid-cols-6 gap-4 mb-8">
      {PUBLISH_STEPS.map((step, index) => {
        const isActive = deploymentProgress?.step === index + 1;
        const isCompleted = deploymentProgress?.step ? deploymentProgress.step > index + 1 : false;
        const isError = deploymentProgress?.status === 'error' && deploymentProgress.step === index + 1;

        return (
          <div
            key={index}
            className={classNames(
              'flex flex-col items-center text-center',
              isActive ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400',
            )}
          >
            <div
              className={classNames('w-8 h-8 rounded-full flex items-center justify-center mb-2', {
                'bg-accent-500 text-white': isActive || isCompleted,
                'bg-gray-100 dark:bg-gray-800': !isActive && !isCompleted,
                'bg-red-500 text-white': isError,
              })}
            >
              {isCompleted ? (
                <Check className="w-4 h-4" />
              ) : isError ? (
                <X className="w-4 h-4" />
              ) : (
                <span className="text-sm font-medium">{index + 1}</span>
              )}
            </div>
            <div className="text-xs font-medium">{step.title}</div>
          </div>
        );
      })}
    </div>
  );

  const renderProgressBar = () => (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {PUBLISH_STEPS[deploymentProgress!.step - 1]?.title}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">In Progress</span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 mb-2">
        <div
          className="bg-accent-500 h-2.5 rounded-full transition-all duration-300"
          style={{
            width: `${((deploymentProgress!.step - 1) / deploymentProgress!.totalSteps) * 100}%`,
          }}
        />
      </div>
    </div>
  );

  const renderSettingsView = () => {
    if (!website) {
      return null;
    }

    return (
      <div className="space-y-6">
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

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100]">
      <motion.div
        className="absolute inset-0 bg-black/80 backdrop-blur-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />

      <motion.div
        className={classNames(
          'w-[900px] h-[644px]',
          'bg-white dark:bg-[#111111]',
          'rounded-2xl shadow-2xl',
          'border border-[#E5E5E5] dark:border-[#2A2A2A]',
          'flex flex-col overflow-hidden',
          'relative',
        )}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 relative">
          <div className="absolute top-4 right-4 z-10">
            <CloseCircle
              variant="Bold"
              className="w-6 h-6 text-gray-500 dark:text-white hover:text-gray-700 dark:hover:text-gray-400 transition-colors cursor-pointer"
              onClick={handleClose}
            />
          </div>

          <div className="p-6 pt-16">
            <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-6">
              {mode === 'publish' ? 'Website Publishing' : 'Website Settings'}
            </h3>

            {(() => {
              if (mode === 'initializing' || (isLoading && mode === 'settings' && !website)) {
                return renderLoadingState();
              }

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

                if (deploymentProgress?.status === 'error') {
                  const handleCopyErrorLogs = () => {
                    const errorLogsText = errorLogs.join('\n');
                    navigator.clipboard.writeText(errorLogsText);
                    setIsCopying(true);
                    setTimeout(() => {
                      setIsCopying(false);
                    }, 2000);
                  };

                  return (
                    <div className="text-red-600 dark:text-red-400">
                      <div className="mb-4">Deployment failed. Please check the logs for more details.</div>
                      <div className="bg-white dark:bg-gray-800 rounded-md p-4 h-64 overflow-y-auto font-mono text-sm border border-gray-200 dark:border-gray-700">
                        {deploymentLogs
                          .filter((log) => !errorLogs.includes(log))
                          .map((log, index) => (
                            <div key={index} className="text-gray-600 dark:text-gray-400">
                              {log}
                            </div>
                          ))}
                        {errorLogs.map((log, index) => (
                          <div key={index} className="text-red-600 dark:text-red-400">
                            {log}
                          </div>
                        ))}
                        <div ref={logsEndRef} />
                      </div>
                      <div className="flex justify-end mt-4">
                        <button
                          onClick={handleCopyErrorLogs}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                        >
                          {isCopying ? (
                            <>
                              <div className="i-ph:check w-4 h-4" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <div className="i-ph:copy w-4 h-4" />
                              Copy Error Logs
                            </>
                          )}
                        </button>
                      </div>
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
        </div>
      </motion.div>
    </div>
  );
}
