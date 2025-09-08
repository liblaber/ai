import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@nanostores/react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { classNames } from '~/utils/classNames';
import {
  closeSettingsPanel,
  resetControlPanelHeader,
  resetTabConfiguration,
  settingsPanelStore,
  tabConfigurationStore,
} from '~/lib/stores/settings';
import type { TabType, TabVisibilityConfig } from './types';
import { DEFAULT_TAB_CONFIG, TAB_ICONS, TAB_LABELS } from './constants';
import { ControlPanelHeader } from './ControlPanelHeader';
import { Settings } from 'lucide-react';

// Import all tab components
import DataTab from '~/components/@settings/tabs/data/DataTab';
import DeployedAppsTab from '~/components/@settings/tabs/deployed-apps/DeployedAppsTab';
import GitHubTab from '~/components/@settings/tabs/connections/GitHubTab';
import { Can } from '@casl/react';
import { AbilityContext } from '~/components/ability/AbilityProvider';
import MembersTab from '~/components/@settings/tabs/users/UsersTab';
import RolesTab from '~/components/@settings/tabs/roles/RolesTab';
import EnvironmentsTab from '~/components/@settings/tabs/environments';
import SecretsManagerTab from '~/components/@settings/tabs/secrets-manager';
import DeploymentMethodsTab from '~/components/@settings/tabs/deployment-methods/DeploymentMethodsTab';

const LAST_ACCESSED_TAB_KEY = 'control-panel-last-tab';

interface TabSectionProps {
  title: string;
  tabs: TabVisibilityConfig[];
  activeTab: TabType | null;
  onTabClick: (tabId: TabType) => void;
}

const TabSection = ({ title, tabs, activeTab, onTabClick }: TabSectionProps) => (
  <>
    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 px-3">{title}</div>
    <AnimatePresence mode="popLayout">
      {tabs.map((tab: TabVisibilityConfig) => {
        const tabId = tab.id as TabType;
        const isActiveTab = activeTab === tabId;

        return (
          <motion.div
            key={tabId}
            layout
            className={classNames(
              'flex items-center gap-3 p-3 h-9 rounded-[15px] mb-2 cursor-pointer',
              'transition-all duration-200',
              isActiveTab
                ? 'bg-white dark:bg-white text-black dark:text-black'
                : 'hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-700 dark:text-white',
            )}
            onClick={() => onTabClick(tabId)}
          >
            <div
              className={classNames(
                'w-5 h-5',
                isActiveTab ? 'text-gray-900 dark:text-gray-900' : 'text-gray-600 dark:text-white',
              )}
            >
              {typeof TAB_ICONS[tabId] === 'string' ? (
                <div className={classNames(TAB_ICONS[tabId] as string, 'w-full h-full')} />
              ) : (
                (() => {
                  const Icon = TAB_ICONS[tabId];
                  return <Icon size={20} />;
                })()
              )}
            </div>
            <span className="text-sm font-medium">{TAB_LABELS[tabId]}</span>
          </motion.div>
        );
      })}
    </AnimatePresence>
  </>
);

export const ControlPanel = () => {
  const { isOpen, selectedTab } = useStore(settingsPanelStore);
  const [activeTab, setActiveTab] = useState<TabType | null>(null);

  // Store values
  const tabConfiguration = useStore(tabConfigurationStore);

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

    // Optimize user mode tab filtering
    return tabConfiguration.userTabs
      .filter((tab) => {
        if (!tab?.id) {
          return false;
        }

        return tab.visible;
      })
      .sort((a, b) => a.order - b.order);
  }, [tabConfiguration, baseTabConfig]);

  const adminTabs = useMemo(() => {
    return tabConfiguration?.adminTabs?.filter((tab) => tab?.id).sort((a, b) => a.order - b.order) || [];
  }, [tabConfiguration]);

  // Reset to default view when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab(null);
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
    closeSettingsPanel();
  };

  const handleTabClick = (tabId: TabType) => {
    if (activeTab === tabId) {
      return;
    }

    setActiveTab(tabId);

    // Reset the header when switching tabs
    resetControlPanelHeader();

    // Store the selected tab
    localStorage.setItem(LAST_ACCESSED_TAB_KEY, tabId);
  };

  const getTabComponent = (tabId: TabType) => {
    switch (tabId) {
      case 'data':
        return <DataTab />;
      case 'environments':
        return <EnvironmentsTab />;
      case 'secrets-manager':
        return <SecretsManagerTab />;
      case 'deployment-methods':
        return <DeploymentMethodsTab />;
      case 'deployed-apps':
        return <DeployedAppsTab />;
      case 'github':
        return <GitHubTab />;
      case 'members':
        return <MembersTab />;
      case 'roles':
        return <RolesTab />;
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
            <RadixDialog.Title className="sr-only">Control Panel Settings</RadixDialog.Title>
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
                  <TabSection title="Workspace" tabs={visibleTabs} activeTab={activeTab} onTabClick={handleTabClick} />

                  <Can I="view" a="AdminApp" ability={React.useContext(AbilityContext)}>
                    <div className="mt-6">
                      <TabSection title="Admin" tabs={adminTabs} activeTab={activeTab} onTabClick={handleTabClick} />
                    </div>
                  </Can>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 flex flex-col min-w-[650px]">
                <ControlPanelHeader />

                <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 relative">
                  <motion.div
                    key={activeTab || 'home'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="m-6"
                  >
                    {activeTab ? (
                      getTabComponent(activeTab)
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4">
                            <Settings className="w-12 h-12" />
                          </div>
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
