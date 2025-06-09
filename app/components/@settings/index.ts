// Core exports
export { ControlPanel } from './core/ControlPanel';
export type { TabType, TabVisibilityConfig } from './core/types';

// Constants
export { TAB_LABELS, TAB_DESCRIPTIONS, DEFAULT_TAB_CONFIG } from './core/constants';

// Shared components
export { TabTile } from './shared/components/TabTile';
export { TabManagement } from './shared/components/TabManagement';

// Utils
export { getVisibleTabs, reorderTabs, resetToDefaultConfig } from './utils/tab-helpers';
export * from './utils/animations';
