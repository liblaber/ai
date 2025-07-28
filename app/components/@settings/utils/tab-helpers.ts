import type { TabVisibilityConfig } from '~/components/@settings/core/types';
import { DEFAULT_TAB_CONFIG } from '~/components/@settings/core/constants';

export const getVisibleTabs = (tabConfiguration: { userTabs: TabVisibilityConfig[] }): TabVisibilityConfig[] => {
  if (!tabConfiguration?.userTabs || !Array.isArray(tabConfiguration.userTabs)) {
    console.warn('Invalid tab configuration, using defaults');
    return DEFAULT_TAB_CONFIG as TabVisibilityConfig[];
  }

  return tabConfiguration.userTabs
    .filter((tab) => {
      if (!tab || typeof tab.id !== 'string') {
        console.warn('Invalid tab entry:', tab);
        return false;
      }

      return tab.visible;
    })
    .sort((a, b) => a.order - b.order);
};

export const reorderTabs = (
  tabs: TabVisibilityConfig[],
  startIndex: number,
  endIndex: number,
): TabVisibilityConfig[] => {
  const result = Array.from(tabs);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  // Update order property
  return result.map((tab, index) => ({
    ...tab,
    order: index,
  }));
};

export const resetToDefaultConfig = (): TabVisibilityConfig[] => {
  return DEFAULT_TAB_CONFIG;
};
