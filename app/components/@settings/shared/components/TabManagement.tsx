import type { ComponentType } from 'react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@nanostores/react';
import { Switch } from '~/components/ui/Switch';
import { classNames } from '~/utils/classNames';
import { tabConfigurationStore, useSettingsStore } from '~/lib/stores/settings';
import { TAB_LABELS } from '~/components/@settings/core/constants';
import type { TabType } from '~/components/@settings/core/types';
import { toast } from 'sonner';
import { TbLayoutGrid } from 'react-icons/tb';
import { CopySuccess, type IconProps } from 'iconsax-reactjs';

// Define tab icons mapping
const TAB_ICONS: Record<TabType, string | ComponentType<IconProps>> = {
  settings: 'i-ph:gear-six-fill',
  github: 'i-ph:github-logo',
  data: 'i-ph:database-fill',
  'service-status': 'i-ph:activity-fill',
  'task-manager': 'i-ph:chart-line-fill',
  'tab-management': 'i-ph:squares-four-fill',
  'deployed-apps': CopySuccess,
  credits: 'i-ph:credit-card-fill',
};

// Define which tabs are default in user mode
const DEFAULT_USER_TABS: TabType[] = ['github', 'data', 'deployed-apps'];

// Define which tabs can be added to user mode
const OPTIONAL_USER_TABS: TabType[] = ['settings', 'task-manager', 'service-status'];

// All available tabs for user mode
const ALL_USER_TABS = [...DEFAULT_USER_TABS, ...OPTIONAL_USER_TABS];

// Define which tabs are beta
const BETA_TABS = new Set<TabType>(['task-manager', 'service-status']);

// Beta label component
const BetaLabel = () => (
  <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-accent-500/10 text-accent-500 font-medium">BETA</span>
);

export const TabManagement = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const tabConfiguration = useStore(tabConfigurationStore);
  const { setSelectedTab } = useSettingsStore();

  const handleTabVisibilityChange = (tabId: TabType, checked: boolean) => {
    // Get current tab configuration
    const currentTab = tabConfiguration.userTabs.find((tab) => tab.id === tabId);

    // If tab doesn't exist in configuration, create it
    if (!currentTab) {
      const newTab = {
        id: tabId,
        visible: checked,
        window: 'user' as const,
        order: tabConfiguration.userTabs.length,
      };

      const updatedTabs = [...tabConfiguration.userTabs, newTab];

      tabConfigurationStore.set({
        ...tabConfiguration,
        userTabs: updatedTabs,
      });

      toast.success(`Tab ${checked ? 'enabled' : 'disabled'} successfully`);

      return;
    }

    // Check if tab can be enabled in user mode
    const canBeEnabled = DEFAULT_USER_TABS.includes(tabId) || OPTIONAL_USER_TABS.includes(tabId);

    if (!canBeEnabled && checked) {
      toast.error('This tab cannot be enabled in user mode');
      return;
    }

    // Update tab visibility
    const updatedTabs = tabConfiguration.userTabs.map((tab) => {
      if (tab.id === tabId) {
        return { ...tab, visible: checked };
      }

      return tab;
    });

    // Update store
    tabConfigurationStore.set({
      ...tabConfiguration,
      userTabs: updatedTabs,
    });

    // Show success message
    toast.success(`Tab ${checked ? 'enabled' : 'disabled'} successfully`);
  };

  // Create a map of existing tab configurations
  const tabConfigMap = new Map(tabConfiguration.userTabs.map((tab) => [tab.id, tab]));

  // Generate the complete list of tabs, including those not in the configuration
  const allTabs = ALL_USER_TABS.map((tabId) => {
    return (
      tabConfigMap.get(tabId) || {
        id: tabId,
        visible: false,
        window: 'user' as const,
        order: -1,
      }
    );
  });

  // Filter tabs based on search query
  const filteredTabs = allTabs.filter((tab) => TAB_LABELS[tab.id].toLowerCase().includes(searchQuery.toLowerCase()));

  useEffect(() => {
    // Reset to first tab when component unmounts
    return () => {
      setSelectedTab('user'); // Reset to user tab when unmounting
    };
  }, [setSelectedTab]);

  return (
    <div className="space-y-6">
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mt-8 mb-4">
          <div className="flex items-center gap-2">
            <div
              className={classNames(
                'w-8 h-8 flex items-center justify-center rounded-lg',
                'bg-liblab-elements-bg-depth-3',
                'text-accent-500',
              )}
            >
              <TbLayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-md font-medium text-liblab-elements-textPrimary">Tab Management</h4>
              <p className="text-sm text-liblab-elements-textSecondary">Configure visible tabs and their order</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <div className="i-ph:magnifying-glass w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tabs..."
              className={classNames(
                'w-full pl-10 pr-4 py-2 rounded-lg',
                'bg-liblab-elements-bg-depth-2',
                'border border-liblab-elements-borderColor',
                'text-liblab-elements-textPrimary',
                'placeholder-liblab-elements-textTertiary',
                'focus:outline-none focus:ring-2 focus:ring-accent-500/30',
                'transition-all duration-200',
              )}
            />
          </div>
        </div>

        {/* Tab Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Default Section Header */}
          {filteredTabs.some((tab) => DEFAULT_USER_TABS.includes(tab.id)) && (
            <div className="col-span-full flex items-center gap-2 mt-4 mb-2">
              <div className="i-ph:star-fill w-4 h-4 text-accent-500" />
              <span className="text-sm font-medium text-liblab-elements-textPrimary">Default Tabs</span>
            </div>
          )}

          {/* Default Tabs */}
          {filteredTabs
            .filter((tab) => DEFAULT_USER_TABS.includes(tab.id))
            .map((tab, index) => (
              <motion.div
                key={tab.id}
                className={classNames(
                  'rounded-lg border bg-liblab-elements-background text-liblab-elements-textPrimary',
                  'bg-liblab-elements-bg-depth-2',
                  'hover:bg-liblab-elements-bg-depth-3',
                  'transition-all duration-200',
                  'relative overflow-hidden group',
                )}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                {/* Status Badges */}
                <div className="absolute top-1 right-1.5 flex gap-1">
                  <span className="px-1.5 py-0.25 text-xs rounded-full bg-accent-500/10 text-accent-500 font-medium mr-2">
                    Default
                  </span>
                </div>

                <div className="flex items-start gap-4 p-4">
                  <motion.div
                    className={classNames(
                      'w-10 h-10 flex items-center justify-center rounded-xl',
                      'bg-liblab-elements-bg-depth-3 group-hover:bg-liblab-elements-bg-depth-4',
                      'transition-all duration-200',
                      tab.visible ? 'text-accent-500' : 'text-liblab-elements-textSecondary',
                    )}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <div
                      className={classNames('w-6 h-6', 'transition-transform duration-200', 'group-hover:rotate-12')}
                    >
                      {typeof TAB_ICONS[tab.id] === 'string' ? (
                        <div className={classNames(TAB_ICONS[tab.id] as string, 'w-full h-full')} />
                      ) : (
                        (() => {
                          const Icon = TAB_ICONS[tab.id] as ComponentType<IconProps>;
                          return <Icon className="w-full h-full" />;
                        })()
                      )}
                    </div>
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-liblab-elements-textPrimary group-hover:text-accent-500 transition-colors">
                            {TAB_LABELS[tab.id]}
                          </h4>
                          {BETA_TABS.has(tab.id) && <BetaLabel />}
                        </div>
                        <p className="text-xs text-liblab-elements-textSecondary mt-0.5">
                          {tab.visible ? 'Visible in user mode' : 'Hidden in user mode'}
                        </p>
                      </div>
                      <Switch
                        checked={tab.visible}
                        onCheckedChange={(checked) => {
                          const isDisabled =
                            !DEFAULT_USER_TABS.includes(tab.id) && !OPTIONAL_USER_TABS.includes(tab.id);

                          if (!isDisabled) {
                            handleTabVisibilityChange(tab.id, checked);
                          }
                        }}
                        className={classNames('data-[state=checked]:bg-accent-500 ml-4', {
                          'opacity-50 pointer-events-none':
                            !DEFAULT_USER_TABS.includes(tab.id) && !OPTIONAL_USER_TABS.includes(tab.id),
                        })}
                      />
                    </div>
                  </div>
                </div>

                <motion.div
                  className="absolute inset-0 border-2 border-accent-500/0 rounded-lg pointer-events-none"
                  animate={{
                    borderColor: tab.visible ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0)',
                    scale: tab.visible ? 1 : 0.98,
                  }}
                  transition={{ duration: 0.2 }}
                />
              </motion.div>
            ))}

          {/* Optional Section Header */}
          {filteredTabs.some((tab) => OPTIONAL_USER_TABS.includes(tab.id)) && (
            <div className="col-span-full flex items-center gap-2 mt-8 mb-2">
              <div className="i-ph:plus-circle-fill w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-liblab-elements-textPrimary">Optional Tabs</span>
            </div>
          )}

          {/* Optional Tabs */}
          {filteredTabs
            .filter((tab) => OPTIONAL_USER_TABS.includes(tab.id))
            .map((tab, index) => (
              <motion.div
                key={tab.id}
                className={classNames(
                  'rounded-lg border bg-liblab-elements-background text-liblab-elements-textPrimary',
                  'bg-liblab-elements-bg-depth-2',
                  'hover:bg-liblab-elements-bg-depth-3',
                  'transition-all duration-200',
                  'relative overflow-hidden group',
                )}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                {/* Status Badges */}
                <div className="absolute top-1 right-1.5 flex gap-1">
                  <span className="px-1.5 py-0.25 text-xs rounded-full bg-blue-500/10 text-blue-500 font-medium mr-2">
                    Optional
                  </span>
                </div>

                <div className="flex items-start gap-4 p-4">
                  <motion.div
                    className={classNames(
                      'w-10 h-10 flex items-center justify-center rounded-xl',
                      'bg-liblab-elements-bg-depth-3 group-hover:bg-liblab-elements-bg-depth-4',
                      'transition-all duration-200',
                      tab.visible ? 'text-accent-500' : 'text-liblab-elements-textSecondary',
                    )}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <div
                      className={classNames('w-6 h-6', 'transition-transform duration-200', 'group-hover:rotate-12')}
                    >
                      {typeof TAB_ICONS[tab.id] === 'string' ? (
                        <div className={classNames(TAB_ICONS[tab.id] as string, 'w-full h-full')} />
                      ) : (
                        (() => {
                          const Icon = TAB_ICONS[tab.id] as ComponentType<IconProps>;
                          return <Icon className="w-full h-full" />;
                        })()
                      )}
                    </div>
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-liblab-elements-textPrimary group-hover:text-accent-500 transition-colors">
                            {TAB_LABELS[tab.id]}
                          </h4>
                          {BETA_TABS.has(tab.id) && <BetaLabel />}
                        </div>
                        <p className="text-xs text-liblab-elements-textSecondary mt-0.5">
                          {tab.visible ? 'Visible in user mode' : 'Hidden in user mode'}
                        </p>
                      </div>
                      <Switch
                        checked={tab.visible}
                        onCheckedChange={(checked) => {
                          const isDisabled =
                            !DEFAULT_USER_TABS.includes(tab.id) && !OPTIONAL_USER_TABS.includes(tab.id);

                          if (!isDisabled) {
                            handleTabVisibilityChange(tab.id, checked);
                          }
                        }}
                        className={classNames('data-[state=checked]:bg-accent-500 ml-4', {
                          'opacity-50 pointer-events-none':
                            !DEFAULT_USER_TABS.includes(tab.id) && !OPTIONAL_USER_TABS.includes(tab.id),
                        })}
                      />
                    </div>
                  </div>
                </div>

                <motion.div
                  className="absolute inset-0 border-2 border-accent-500/0 rounded-lg pointer-events-none"
                  animate={{
                    borderColor: tab.visible ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0)',
                    scale: tab.visible ? 1 : 0.98,
                  }}
                  transition={{ duration: 0.2 }}
                />
              </motion.div>
            ))}
        </div>
      </motion.div>
    </div>
  );
};
