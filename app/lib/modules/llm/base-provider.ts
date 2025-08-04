import type { LanguageModelV1 } from 'ai';
import type { ProviderInfo, ProviderConfig } from './types';
import type { IProviderSetting } from '~/types/model';
import { createOpenAI } from '@ai-sdk/openai';
import { env } from '~/env';

export abstract class BaseProvider implements ProviderInfo {
  abstract name: string;
  abstract config: ProviderConfig;

  getApiKeyLink?: string;
  labelForGetApiKey?: string;
  icon?: string;

  getProviderBaseUrlAndKey(options: {
    apiKeys?: Record<string, string>;
    providerSettings?: IProviderSetting;
    serverEnv?: Record<string, string>;
    defaultBaseUrlKey: string;
    defaultApiTokenKey: string;
  }) {
    const { apiKeys, providerSettings, serverEnv, defaultBaseUrlKey, defaultApiTokenKey } = options;
    let settingsBaseUrl = providerSettings?.baseUrl;

    if (settingsBaseUrl && settingsBaseUrl.length == 0) {
      settingsBaseUrl = undefined;
    }

    const baseUrlKey = this.config.baseUrlKey || defaultBaseUrlKey;
    let baseUrl =
      settingsBaseUrl ||
      (env.server ? (env.server as unknown as Record<string, string | undefined>)[baseUrlKey] : undefined) ||
      (env.client ? (env.client as unknown as Record<string, string | undefined>)[baseUrlKey] : undefined) ||
      this.config.baseUrl;

    if (baseUrl && baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    const apiTokenKey = this.config.apiTokenKey || defaultApiTokenKey;
    const apiKey = apiKeys?.[this.name] || serverEnv?.[apiTokenKey];

    return {
      baseUrl,
      apiKey,
    };
  }

  abstract getModelInstance(options: {
    model: string;
    serverEnv?: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1;
}

type OptionalApiKey = string | undefined;

export function getOpenAILikeModel(baseURL: string, apiKey: OptionalApiKey, model: string) {
  const openai = createOpenAI({
    baseURL,
    apiKey,
  });

  return openai(model);
}
