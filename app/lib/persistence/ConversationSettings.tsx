import { useStore } from '@nanostores/react';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { ChevronDown, ChevronUp } from 'lucide-react';
import WithTooltip from '~/components/ui/Tooltip';
import { description as descriptionStore } from '~/lib/persistence';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogDescription, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import { useEnvironmentDataSourcesStore } from '~/lib/stores/environmentDataSources';
import { toast } from 'sonner';
import { chatId } from '~/lib/persistence/useConversationHistory';
import { updateConversation } from '~/lib/persistence/conversations';
import { ActionRunner } from '~/lib/runtime/action-runner';
import { updateLatestSnapshot } from '~/lib/persistence/snapshots';
import { logger } from '~/utils/logger';
import { getDataSourceProperties } from '~/components/@settings/utils/data-sources';

interface SwitchEnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  targetEnvironmentName: string;
}

function SwitchEnvironmentModal({ isOpen, onClose, onConfirm, targetEnvironmentName }: SwitchEnvironmentModalProps) {
  return (
    <DialogRoot open={isOpen} onOpenChange={onClose}>
      <Dialog className="backdrop-blur-[1px]" onClose={onClose} onBackdrop={onClose}>
        <div className="rounded-xl bg-gray-50 dark:bg-gray-900 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div>
                  <DialogTitle title="Switch environments" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <DialogDescription className="text-sm text-secondary">
                Switching to "{targetEnvironmentName}" environment may break your app. Make sure your data source schema
                matches between both environments.
              </DialogDescription>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-[#E5E5E5] dark:border-[#1A1A1A]">
              <button
                onClick={onClose}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-[#F5F5F5] hover:bg-[#E5E5E5] dark:bg-[#1A1A1A] dark:hover:bg-[#2A2A2A] text-primary"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-accent-500 hover:bg-accent-600 text-gray-950 dark:text-gray-950"
              >
                Switch
              </button>
            </div>
          </div>
        </div>
      </Dialog>
    </DialogRoot>
  );
}

export function ConversationSettings() {
  const initialDescription = useStore(descriptionStore)!;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [targetEnvironmentId, setTargetEnvironmentId] = useState<string>('');
  const [isUpdatingEnvironment, setIsUpdatingEnvironment] = useState(false);
  const [currentDescription, setCurrentDescription] = useState(initialDescription);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const { environmentDataSources, selectedEnvironmentDataSource, setSelectedEnvironmentDataSource } =
    useEnvironmentDataSourcesStore();

  // Update local description when global store changes
  useEffect(() => {
    setCurrentDescription(initialDescription);
  }, [initialDescription]);

  // Get current data source and environment info
  const currentDataSource = environmentDataSources.find(
    (eds) =>
      eds.dataSourceId === selectedEnvironmentDataSource.dataSourceId &&
      eds.environmentId === selectedEnvironmentDataSource.environmentId,
  );

  // Get available environments for the current data source
  const availableEnvironments = environmentDataSources.filter(
    (eds) => eds.dataSourceId === selectedEnvironmentDataSource.dataSourceId,
  );

  const targetEnvironment = availableEnvironments.find((env) => env.environmentId === targetEnvironmentId);

  const handleSaveDescription = useCallback(
    async (newDescription: string) => {
      if (!newDescription.trim() || newDescription === initialDescription) {
        return;
      }

      // Validate description length
      if (newDescription.length > 100) {
        toast.error('Description must be 100 characters or less.');
        return;
      }

      try {
        const currentChatId = chatId.get();

        if (!currentChatId) {
          toast.error('Chat ID is not available');
          return;
        }

        await updateConversation(currentChatId, { description: newDescription });
        descriptionStore.set(newDescription);
      } catch (error) {
        toast.error('Failed to update conversation name: ' + (error as Error).message);
      }
    },
    [initialDescription],
  );

  // Debounce timer ref
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setCurrentDescription(newValue);

      // Clear existing timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // Set new timer for auto-save
      const timeoutId = setTimeout(() => {
        handleSaveDescription(newValue);
      }, 1000);

      setDebounceTimer(timeoutId);
    },
    [handleSaveDescription, debounceTimer],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  // Handle clicking outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }

    return undefined;
  }, [isDropdownOpen]);

  // Handle window resize to reposition dropdown
  useEffect(() => {
    const handleResize = () => {
      if (isDropdownOpen && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 8,
          left: rect.left,
        });
      }
    };

    if (isDropdownOpen) {
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleResize);
      };
    }

    return undefined;
  }, [isDropdownOpen]);

  const handleEnvironmentChange = (newEnvironmentId: string) => {
    if (newEnvironmentId === selectedEnvironmentDataSource.environmentId) {
      return;
    }

    setTargetEnvironmentId(newEnvironmentId);
    setIsSwitchModalOpen(true);
  };

  const handleEnvironmentSwitch = async () => {
    if (!targetEnvironmentId || !selectedEnvironmentDataSource.dataSourceId) {
      setIsSwitchModalOpen(false);
      return;
    }

    setIsUpdatingEnvironment(true);

    try {
      const dataSourceProperties = await getDataSourceProperties(
        selectedEnvironmentDataSource.dataSourceId,
        targetEnvironmentId,
      );

      let updatedEnvContent: string = '';

      for (const dataSourceProperty of dataSourceProperties) {
        const encodedPropertyValue = encodeURIComponent(dataSourceProperty.value);
        updatedEnvContent = await ActionRunner.updateEnvironmentVariable(dataSourceProperty.type, encodedPropertyValue);
      }

      setSelectedEnvironmentDataSource(selectedEnvironmentDataSource.dataSourceId, targetEnvironmentId);

      const currentChatId = chatId.get();

      if (currentChatId) {
        try {
          await updateConversation(currentChatId, {
            environmentId: targetEnvironmentId,
            dataSourceId: selectedEnvironmentDataSource.dataSourceId,
          });

          await updateLatestSnapshot(currentChatId, '.env', updatedEnvContent);
        } catch (error) {
          logger.error(error);
          toast.error("Failed to update the conversation's environment.");
        }
      }

      toast.success('Environment switched successfully.');
    } catch (error) {
      console.error('Failed to switch environment:', error);
      toast.error('Failed to switch environment. Please try again.');
    } finally {
      setIsUpdatingEnvironment(false);
      setIsSwitchModalOpen(false);
      setIsDropdownOpen(false);
      setTargetEnvironmentId('');
    }
  };

  if (!initialDescription) {
    return null;
  }

  return (
    <>
      <div className="relative flex items-center justify-center">
        <TooltipProvider>
          <WithTooltip tooltip="Conversation settings">
            <button
              ref={triggerRef}
              className="flex items-center gap-2 hover:bg-depth-1 rounded-md px-2 py-1 transition-colors cursor-pointer"
              onClick={() => {
                if (!isDropdownOpen && triggerRef.current) {
                  const rect = triggerRef.current.getBoundingClientRect();
                  const position = {
                    top: rect.bottom + 8,
                    left: rect.left,
                  };
                  setDropdownPosition(position);
                }

                setIsDropdownOpen(!isDropdownOpen);
              }}
            >
              <span className="text-primary">{currentDescription}</span>
              {isDropdownOpen ? (
                <ChevronUp className="h-4 w-4 opacity-50 hover:opacity-100" />
              ) : (
                <ChevronDown className="h-4 w-4 opacity-50 hover:opacity-100" />
              )}
            </button>
          </WithTooltip>
        </TooltipProvider>
        {currentDataSource && (
          <span className="ml-2 px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
            {currentDataSource.environment.name}
          </span>
        )}

        {/* Dropdown Content */}
        {isDropdownOpen && (
          <div
            ref={dropdownRef}
            className="fixed w-96 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden z-[999]"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
            }}
          >
            <div className="p-6">
              <div className="space-y-4 text-left">
                {/* Conversation Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Name</label>
                  <input
                    type="text"
                    value={currentDescription}
                    onChange={handleDescriptionChange}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter conversation name"
                    maxLength={100}
                    autoFocus={false}
                  />
                </div>

                {/* Data Source (Read-only) */}
                {currentDataSource && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                      Data Source
                    </label>
                    <div className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-400">
                      {currentDataSource.dataSource.name}
                    </div>
                  </div>
                )}

                {/* Environment Dropdown */}
                {availableEnvironments.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                      Data Source Environment
                    </label>
                    <select
                      value={selectedEnvironmentDataSource.environmentId || ''}
                      onChange={(e) => handleEnvironmentChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isUpdatingEnvironment}
                    >
                      {availableEnvironments.map((env) => (
                        <option key={env.environmentId} value={env.environmentId}>
                          {env.environment.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Switch the data source to a different environment
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <SwitchEnvironmentModal
        isOpen={isSwitchModalOpen}
        onClose={() => {
          setIsSwitchModalOpen(false);
          setTargetEnvironmentId('');
        }}
        onConfirm={handleEnvironmentSwitch}
        targetEnvironmentName={targetEnvironment?.environment.name || ''}
      />
    </>
  );
}
