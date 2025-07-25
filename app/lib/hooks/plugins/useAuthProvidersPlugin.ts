'use client';
import { usePluginStore } from '~/lib/plugins/plugin-store';
import { AuthPluginManager } from '~/lib/plugins/auth/auth-plugin-manager';
import type { AuthPluginId } from '~/lib/plugins/types';

export function useAuthProvidersPlugin() {
  const { pluginAccess } = usePluginStore();

  const authProviders = AuthPluginManager.authProviders.filter(
    (provider) => pluginAccess.auth[provider.pluginId as AuthPluginId],
  );

  const socialProviders = authProviders.filter((provider) => provider.pluginId !== 'anonymous');
  const anonymousProvider = authProviders.find((provider) => provider.pluginId === 'anonymous');

  return {
    socialProviders,
    anonymousProvider,
  };
}
