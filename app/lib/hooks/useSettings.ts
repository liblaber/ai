import { useStore } from '@nanostores/react';
import {
  autoSelectStarterTemplate,
  enableContextOptimizationStore,
  promptStore,
  providersStore,
  resetTabConfiguration as resetTabConfig,
  tabConfigurationStore,
  updateAutoSelectTemplate,
  updateContextOptimization,
  updatePromptId,
  updateProviderSettings as updateProviderSettingsStore,
  updateTabConfiguration as updateTabConfig,
} from '~/lib/stores/settings';
import { useCallback, useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import type { IProviderConfig, IProviderSetting, ProviderInfo } from '~/types/model';
import type { TabVisibilityConfig, TabWindowConfig } from '~/components/@settings/core/types';

export interface UseSettingsReturn {
  // Provider settings
  providers: Record<string, IProviderConfig>;
  activeProviders: ProviderInfo[];
  updateProviderSettings: (provider: string, config: IProviderSetting) => void;

  // Debug and development settings
  promptId: string;
  setPromptId: (promptId: string) => void;
  autoSelectTemplate: boolean;
  setAutoSelectTemplate: (enabled: boolean) => void;
  contextOptimizationEnabled: boolean;
  enableContextOptimization: (enabled: boolean) => void;

  // Tab configuration
  tabConfiguration: TabWindowConfig;
  updateTabConfiguration: (config: TabVisibilityConfig) => void;
  resetTabConfiguration: () => void;
}

// Add interface to match ProviderSetting type
interface ProviderSettingWithIndex extends IProviderSetting {
  [key: string]: any;
}

export function useSettings(): UseSettingsReturn {
  const providers = useStore(providersStore);
  const promptId = useStore(promptStore);
  const autoSelectTemplate = useStore(autoSelectStarterTemplate);
  const [activeProviders, setActiveProviders] = useState<ProviderInfo[]>([]);
  const contextOptimizationEnabled = useStore(enableContextOptimizationStore);
  const tabConfiguration = useStore(tabConfigurationStore);

  useEffect(() => {
    const active = Object.entries(providers)
      .filter(([_key, provider]) => provider.settings.enabled)
      .map(([_k, p]) => p);

    setActiveProviders(active);
  }, [providers]);

  const updateProviderSettings = useCallback((provider: string, config: ProviderSettingWithIndex) => {
    updateProviderSettingsStore(provider, config);
  }, []);

  const setPromptId = useCallback((id: string) => {
    updatePromptId(id);
  }, []);

  const setAutoSelectTemplate = useCallback((enabled: boolean) => {
    updateAutoSelectTemplate(enabled);
  }, []);

  const enableContextOptimization = useCallback((enabled: boolean) => {
    updateContextOptimization(enabled);
  }, []);

  useEffect(() => {
    const providers = providersStore.get();
    const providerSetting: Record<string, IProviderSetting> = {};
    Object.keys(providers).forEach((provider) => {
      providerSetting[provider] = providers[provider].settings;
    });
    Cookies.set('providers', JSON.stringify(providerSetting));
  }, [providers]);

  return {
    providers,
    activeProviders,
    updateProviderSettings,
    promptId,
    setPromptId,
    autoSelectTemplate,
    setAutoSelectTemplate,
    contextOptimizationEnabled,
    enableContextOptimization,
    tabConfiguration,
    updateTabConfiguration: updateTabConfig,
    resetTabConfiguration: resetTabConfig,
  };
}
