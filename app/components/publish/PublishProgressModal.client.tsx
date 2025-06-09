import { useEffect, useRef, useState } from 'react';
import { classNames } from '~/utils/classNames';
import { motion } from 'framer-motion';
import { CloseCircle, MinusCirlce } from 'iconsax-reactjs';
import * as RadixSelect from '@radix-ui/react-select';
import { useStore } from '@nanostores/react';
import { updateWebsite, websiteStore, type Website } from '~/lib/stores/websiteStore';
import type { NetlifySiteInfo } from '~/types/netlify';

interface PublishProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancel: () => void;
  mode: 'publish' | 'settings';
  onPublishClick: () => void;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; icon: string }[];
  className?: string;
  disabled?: boolean;
}

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
  error?: {
    code: string;
    message: string;
    details?: any;
    canRetry?: boolean;
  };
}

// Constants
const PUBLISH_STEPS = [
  { title: 'Initializing', description: 'Preparing deployment environment' },
  { title: 'Site Setup', description: 'Creating or updating Netlify site' },
  { title: 'File Preparation', description: 'Preparing project files' },
  { title: 'Dependencies', description: 'Installing project dependencies' },
  { title: 'Configuration', description: 'Configuring deployment settings' },
  { title: 'Deployment', description: 'Deploying to Netlify' },
];

const ACCESS_OPTIONS = [
  { value: 'public', label: 'Public', icon: 'i-ph:lock-open w-4 h-4' },
  { value: 'private', label: 'Private', icon: 'i-ph:lock w-4 h-4' },
];

// Components
function CustomSelect({ value, onChange, options, className, disabled }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <RadixSelect.Root value={value} onValueChange={onChange} open={isOpen} onOpenChange={setIsOpen} disabled={disabled}>
      <RadixSelect.Trigger
        className={classNames(
          'w-[30%] px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300',
          'flex items-center justify-between',
          'hover:border-gray-300 dark:hover:border-gray-600',
          'focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500',
          'transition-colors duration-200',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
          className,
        )}
      >
        <RadixSelect.Value>
          <div className="flex items-center gap-2">
            <div className={options.find((opt) => opt.value === value)?.icon} />
            <span className="font-medium">{options.find((opt) => opt.value === value)?.label}</span>
          </div>
        </RadixSelect.Value>
        <RadixSelect.Icon>
          <div
            className={classNames(
              'i-ph:caret-down w-4 h-4 transition-transform duration-200',
              isOpen ? 'transform rotate-180' : '',
            )}
          />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg overflow-hidden z-50"
          position="popper"
          sideOffset={4}
        >
          <RadixSelect.ScrollUpButton className="flex items-center justify-center h-6 bg-white dark:bg-gray-800 cursor-default">
            <div className="i-ph:caret-up w-4 h-4" />
          </RadixSelect.ScrollUpButton>

          <RadixSelect.Viewport className="p-1">
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                className={classNames(
                  'px-3 py-2 text-gray-700 dark:text-gray-300 rounded-md cursor-pointer',
                  'flex items-center gap-2',
                  'hover:bg-gray-100 dark:hover:bg-gray-700',
                  'focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700',
                  'transition-colors duration-200',
                  'data-[state=checked]:bg-accent-500/10 dark:data-[state=checked]:bg-accent-500/20',
                  'data-[state=checked]:text-accent-500',
                )}
              >
                <div className={option.icon} />
                <RadixSelect.ItemText className="font-medium">{option.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="ml-auto">
                  <div className="i-ph:check w-4 h-4" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>

          <RadixSelect.ScrollDownButton className="flex items-center justify-center h-6 bg-white dark:bg-gray-800 cursor-default">
            <div className="i-ph:caret-down w-4 h-4" />
          </RadixSelect.ScrollDownButton>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}

// Main Component
export function PublishProgressModal({ isOpen, onClose, onCancel, mode, onPublishClick }: PublishProgressModalProps) {
  // State
  const { website, isLoading, deploymentProgress, deploymentLogs } = useStore(websiteStore);
  const [accessType, setAccessType] = useState<'public' | 'private'>(website?.isPublic ? 'public' : 'private');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [allowedUserEmails, setAllowedUserEmails] = useState<string[]>(website?.allowedUserEmails || []);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAccessTypeUpdating, setIsAccessTypeUpdating] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  useEffect(() => {
    if (website) {
      setAccessType(website.isPublic ? 'public' : 'private');
      setAllowedUserEmails(website.allowedUserEmails);
    }
  }, [website]);

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

  const handleAccessTypeChange = async (value: string) => {
    if (isUpdating || isAccessTypeUpdating || !website) {
      return;
    }

    const isPublic = value === 'public';
    setAccessType(value as 'public' | 'private');

    try {
      setIsAccessTypeUpdating(true);
      await updateWebsite(website.id, { isPublic });
    } catch (error) {
      // Revert the access type if the update failed
      setAccessType(website.isPublic ? 'public' : 'private');
      console.error('Error updating website:', error);
    } finally {
      setIsAccessTypeUpdating(false);
    }
  };

  const handleAddUser = async () => {
    if (!website || !newUserEmail || allowedUserEmails.includes(newUserEmail) || isUpdating || isAccessTypeUpdating) {
      return;
    }

    const updatedEmails = [...allowedUserEmails, newUserEmail];
    setAllowedUserEmails(updatedEmails);
    setNewUserEmail('');

    try {
      setIsUpdating(true);
      await updateWebsite(website.id, { allowedUserEmails: updatedEmails });
    } catch (error) {
      console.error('Error updating website:', error);
    } finally {
      setIsUpdating(false);
      emailInputRef.current?.focus();
    }
  };

  const handleRemoveUser = async (email: string) => {
    if (!website || isUpdating) {
      return;
    }

    const updatedEmails = allowedUserEmails.filter((e) => e !== email);
    setAllowedUserEmails(updatedEmails);

    try {
      setIsUpdating(true);
      await updateWebsite(website.id, { allowedUserEmails: updatedEmails });
    } catch (error) {
      console.error('Error updating website:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddUser();
    }
  };

  if (!isOpen) {
    return null;
  }

  // Render Functions
  const renderLoadingState = () => (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-accent-500 border-t-transparent mb-4" />
      <div className="text-gray-700 dark:text-gray-300">Creating site...</div>
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
                <div className="i-ph:check w-4 h-4" />
              ) : isError ? (
                <div className="i-ph:x w-4 h-4" />
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

  const renderErrorState = (error: ProgressData['error']) => {
    if (!error) {
      return null;
    }

    const getErrorMessage = () => {
      switch (error.code) {
        case 'SITE_CREATION_FAILED':
          return 'Failed to create a new Netlify site. This could be due to a temporary issue with Netlify or an invalid site name.';
        case 'DEPLOYMENT_FAILED':
          return 'The deployment process failed. This could be due to build errors or configuration issues.';
        default:
          return error.message || 'An unexpected error occurred during deployment.';
      }
    };

    const getErrorAction = () => {
      if (error.canRetry) {
        return (
          <button
            onClick={onPublishClick}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-md hover:bg-accent-600"
          >
            <div className="i-ph:arrow-clockwise w-4 h-4" />
            Try Again
          </button>
        );
      }

      return null;
    };

    return (
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
          <div className="i-ph:x-circle w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Deployment Failed</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{getErrorMessage()}</p>
        {error.details && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-4 mb-4 text-left">
            <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {JSON.stringify(error.details, null, 2)}
            </pre>
          </div>
        )}
        {getErrorAction()}
      </div>
    );
  };

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
              <div className="i-ph:arrow-square-out w-4 h-4" />
            </a>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onPublishClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
          >
            <div className="i-ph:rocket-launch w-4 h-4" />
            Publish New Version
          </button>

          {website.siteUrl && (
            <button
              onClick={handleCopyLink}
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
                  Copy Link
                </>
              )}
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Access</label>
            <div className="relative">
              <CustomSelect
                value={accessType}
                onChange={handleAccessTypeChange}
                options={ACCESS_OPTIONS}
                disabled={isAccessTypeUpdating}
              />
              {isAccessTypeUpdating && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-accent-500 border-t-transparent" />
                </div>
              )}
            </div>
          </div>

          {accessType === 'private' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  ref={emailInputRef}
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter email address"
                  disabled={isUpdating || isAccessTypeUpdating}
                  className={classNames(
                    'flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300',
                    isUpdating || isAccessTypeUpdating ? 'opacity-50 cursor-not-allowed' : '',
                  )}
                />
                <button
                  onClick={handleAddUser}
                  disabled={isUpdating || isAccessTypeUpdating}
                  className={classNames(
                    'px-4 py-2 bg-accent-500 text-white rounded-md hover:bg-accent-600',
                    isUpdating || isAccessTypeUpdating ? 'opacity-50 cursor-not-allowed' : '',
                  )}
                >
                  {isUpdating ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    'Add'
                  )}
                </button>
              </div>

              {allowedUserEmails.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Viewers with access
                  </label>
                  {allowedUserEmails.map((email) => (
                    <div
                      key={email}
                      className="flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700"
                    >
                      <span className="text-gray-700 dark:text-gray-300">{email}</span>
                      <button
                        onClick={() => handleRemoveUser(email)}
                        className="text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                      >
                        <MinusCirlce variant="Bold" size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
              {mode === 'publish' ? 'Publishing Wizard' : 'Site Settings'}
            </h3>

            {(() => {
              if (isLoading && mode === 'settings' && !website) {
                return renderLoadingState();
              }

              if (mode === 'publish') {
                if (deploymentProgress?.status === 'error') {
                  return renderErrorState(deploymentProgress.error);
                }

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
