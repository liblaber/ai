import type { ComponentType } from 'react';
import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@nanostores/react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { classNames } from '~/utils/classNames';
import { TabManagement } from '~/components/@settings/shared/components/TabManagement';
import {
  closeSettingsPanel,
  developerModeStore,
  resetTabConfiguration,
  settingsPanelStore,
  tabConfigurationStore,
} from '~/lib/stores/settings';
import type { TabType, TabVisibilityConfig } from './types';
import { DEFAULT_TAB_CONFIG, TAB_ICONS, TAB_LABELS } from './constants';
import type { IconProps } from 'iconsax-reactjs';
import { CloseCircle } from 'iconsax-reactjs';

// Import all tab components
import SettingsTab from '~/components/@settings/tabs/settings/SettingsTab';
import DataTab from '~/components/@settings/tabs/data/DataTab';
import TaskManagerTab from '~/components/@settings/tabs/task-manager/TaskManagerTab';
import ServiceStatusTab from '~/components/@settings/tabs/providers/status/ServiceStatusTab';
import DeployedAppsTab from '~/components/@settings/tabs/deployed-apps/DeployedAppsTab';
import GitHubTab from '~/components/@settings/tabs/connections/GitHubTab';
import CreditsTab from '~/components/@settings/tabs/credits/CreditsTab';

interface TabWithDevType extends TabVisibilityConfig {
  isExtraDevTab?: boolean;
}

interface ExtendedTabConfig extends TabVisibilityConfig {
  isExtraDevTab?: boolean;
}

interface BaseTabConfig {
  id: TabType;
  visible: boolean;
  window: 'user' | 'developer';
  order: number;
}

const LAST_ACCESSED_TAB_KEY = 'control-panel-last-tab';

export const ControlPanel = () => {
  const { isOpen, selectedTab } = useStore(settingsPanelStore);
  const [activeTab, setActiveTab] = useState<TabType | null>(null);
  const [showTabManagement, setShowTabManagement] = useState(false);

  // Store values
  const tabConfiguration = useStore(tabConfigurationStore);
  const developerMode = useStore(developerModeStore);

  // Memoize the base tab configurations to avoid recalculation
  const baseTabConfig = useMemo(() => {
    return new Map(DEFAULT_TAB_CONFIG.map((tab) => [tab.id, tab]));
  }, []);

  // Add visibleTabs logic using useMemo with optimized calculations
  const visibleTabs = useMemo(() => {
    if (!tabConfiguration?.userTabs || !Array.isArray(tabConfiguration.userTabs)) {
      console.warn('Invalid tab configuration, resetting to defaults');
      resetTabConfiguration();

      return [];
    }

    // In developer mode, show ALL tabs without restrictions
    if (developerMode) {
      const seenTabs = new Set<TabType>();
      const devTabs: ExtendedTabConfig[] = [];

      // Process tabs in order of priority: developer, user, default
      const processTab = (tab: BaseTabConfig) => {
        if (!seenTabs.has(tab.id)) {
          seenTabs.add(tab.id);
          devTabs.push({
            id: tab.id,
            visible: true,
            window: 'developer',
            order: tab.order || devTabs.length,
          });
        }
      };

      // Process tabs in priority order
      tabConfiguration.developerTabs?.forEach((tab) => processTab(tab as BaseTabConfig));
      tabConfiguration.userTabs.forEach((tab) => processTab(tab as BaseTabConfig));
      DEFAULT_TAB_CONFIG.forEach((tab) => processTab(tab as BaseTabConfig));

      // Add Tab Management tile
      devTabs.push({
        id: 'tab-management' as TabType,
        visible: true,
        window: 'developer',
        order: devTabs.length,
        isExtraDevTab: true,
      });

      return devTabs.sort((a, b) => a.order - b.order);
    }

    // Optimize user mode tab filtering
    return tabConfiguration.userTabs
      .filter((tab) => {
        if (!tab?.id) {
          return false;
        }

        return tab.visible && tab.window === 'user';
      })
      .sort((a, b) => a.order - b.order);
  }, [tabConfiguration, developerMode, baseTabConfig]);

  // Reset to default view when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab(null);
      setShowTabManagement(false);
    } else {
      // Try to restore the last accessed tab
      const lastAccessedTab = localStorage.getItem(LAST_ACCESSED_TAB_KEY) as TabType | null;
      const firstVisibleTab = visibleTabs[0]?.id as TabType | null;

      // If there's a selected tab from props, use that
      if (selectedTab) {
        setActiveTab(selectedTab as TabType);
        localStorage.setItem(LAST_ACCESSED_TAB_KEY, selectedTab);
      }
      // Otherwise, try to restore the last accessed tab
      else if (lastAccessedTab && visibleTabs.some((tab) => tab.id === lastAccessedTab)) {
        setActiveTab(lastAccessedTab);
      }
      // If no last accessed tab or it's not visible, use the first visible tab
      else if (firstVisibleTab) {
        setActiveTab(firstVisibleTab);
        localStorage.setItem(LAST_ACCESSED_TAB_KEY, firstVisibleTab);
      }
    }
  }, [isOpen, selectedTab, visibleTabs]);

  // Handle closing
  const handleClose = () => {
    setActiveTab(null);
    setShowTabManagement(false);
    closeSettingsPanel();
  };

  const handleTabClick = (tabId: TabType) => {
    setActiveTab(tabId);
    setShowTabManagement(false);

    // Store the selected tab
    localStorage.setItem(LAST_ACCESSED_TAB_KEY, tabId);
  };

  const getTabComponent = (tabId: TabType | 'tab-management') => {
    switch (tabId) {
      case 'settings':
        return <SettingsTab />;
      case 'data':
        return <DataTab />;
      case 'task-manager':
        return <TaskManagerTab />;
      case 'service-status':
        return <ServiceStatusTab />;
      case 'deployed-apps':
        return <DeployedAppsTab />;
      case 'credits':
        return <CreditsTab />;
      case 'github':
        return <GitHubTab />;
      case 'tab-management':
        return <TabManagement />;
      default:
        return null;
    }
  };

  return (
    <RadixDialog.Root open={isOpen}>
      <RadixDialog.Portal>
        <div className="fixed inset-0 flex items-center justify-center z-[100]">
          <RadixDialog.Overlay asChild>
            <motion.div
              className="absolute inset-0 bg-black/80 backdrop-blur-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          </RadixDialog.Overlay>

          <RadixDialog.Content
            aria-describedby={undefined}
            onEscapeKeyDown={handleClose}
            onPointerDownOutside={handleClose}
            className="relative z-[101] focus-visible:outline-none"
          >
            <motion.div
              className={classNames(
                'w-[900px] h-[644px]',
                'bg-white dark:bg-[#111111]',
                'rounded-2xl shadow-2xl',
                'border border-[#E5E5E5] dark:border-[#2A2A2A]',
                'flex overflow-hidden',
                'relative',
              )}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Sidebar */}
              <div className="w-[250px] h-full bg-white dark:bg-black border-r border-[#E5E5E5] dark:border-[#1A1A1A] flex flex-col">
                <div className="flex-1 overflow-y-auto p-4">
                  <AnimatePresence mode="popLayout">
                    {(visibleTabs as TabWithDevType[]).map((tab: TabWithDevType) => (
                      <motion.div
                        key={tab.id}
                        layout
                        className={classNames(
                          'flex items-center gap-3 p-3 h-9 rounded-[15px] mb-2 cursor-pointer',
                          'transition-all duration-200',
                          activeTab === tab.id
                            ? 'bg-white dark:bg-white text-black dark:text-black'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-700 dark:text-white',
                        )}
                        onClick={() => handleTabClick(tab.id as TabType)}
                      >
                        <div
                          className={classNames(
                            'w-5 h-5',
                            activeTab === tab.id ? 'text-gray-900 dark:text-gray-900' : 'text-gray-600 dark:text-white',
                          )}
                        >
                          {typeof TAB_ICONS[tab.id] === 'string' ? (
                            <div className={classNames(TAB_ICONS[tab.id] as string, 'w-full h-full')} />
                          ) : (
                            (() => {
                              const Icon = TAB_ICONS[tab.id] as ComponentType<IconProps>;
                              return <Icon variant="Bold" size={20} />;
                            })()
                          )}
                        </div>
                        <span className="text-sm font-medium">{TAB_LABELS[tab.id]}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 flex flex-col min-w-[650px]">
                <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 relative">
                  <div className="absolute top-4 right-4 z-10">
                    <CloseCircle
                      variant="Bold"
                      className="w-6 h-6 text-gray-500 dark:text-white hover:text-gray-700 dark:hover:text-gray-400 transition-colors cursor-pointer"
                      onClick={handleClose}
                    />
                  </div>
                  <motion.div
                    key={activeTab || 'home'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="p-6 pt-16"
                  >
                    {showTabManagement ? (
                      <TabManagement />
                    ) : activeTab ? (
                      getTabComponent(activeTab)
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="i-ph:gear-six-fill w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Welcome to Control Panel
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Select a tab from the sidebar to get started
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </RadixDialog.Content>
        </div>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};
