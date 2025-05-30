import type { IProviderSetting } from '~/types/model';
import { BaseProvider } from './base-provider';
import type { ModelInfo } from './types';
import * as providers from './registry';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('LLMManager');

export class LLMManager {
  private static _instance: LLMManager;
  private _providers: Map<string, BaseProvider> = new Map();
  private _modelList: ModelInfo[] = [];
  private readonly _env: any = {};
  private readonly _defaultModel: string;
  private readonly _defaultProvider: string;

  get env() {
    return this._env;
  }

  get defaultModel(): string {
    return this._defaultModel;
  }

  private constructor(_env: Record<string, string>) {
    this._env = _env;
    this._defaultModel = _env.DEFAULT_LLM_MODEL || 'claude-3-5-sonnet-latest';
    this._defaultProvider = _env.DEFAULT_LLM_PROVIDER || 'Anthropic';

    // Only register the default provider
    this._registerDefaultProvider();
  }

  static getInstance(env: Record<string, string> = {}): LLMManager {
    if (!LLMManager._instance) {
      LLMManager._instance = new LLMManager(env);
    }

    return LLMManager._instance;
  }

  registerProvider(provider: BaseProvider) {
    if (this._providers.has(provider.name)) {
      logger.warn(`Provider ${provider.name} is already registered. Skipping.`);
      return;
    }

    if (!['Google', 'Anthropic'].includes(provider.name)) {
      logger.warn(`Provider ${provider.name} is not allowed. Only Google and Anthropic are supported. Skipping.`);
      return;
    }

    this._providers.set(provider.name, provider);
    this._modelList = [...this._modelList, ...provider.staticModels];
  }

  getProvider(name: string): BaseProvider | undefined {
    return this._providers.get(name);
  }

  getAllProviders(): BaseProvider[] {
    return Array.from(this._providers.values());
  }

  async updateModelList(options: {
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
    serverEnv?: Record<string, string>;
  }): Promise<ModelInfo[]> {
    const { apiKeys, serverEnv } = options;
    const provider = this._providers.get(this._defaultProvider);

    if (!provider) {
      throw new Error(`Default provider ${this._defaultProvider} not found`);
    }

    // Get dynamic models from the default provider
    const dynamicModels = await provider
      .getDynamicModels?.(apiKeys, undefined, serverEnv)
      .then((models) => {
        logger.info(`Caching ${models.length} dynamic models for ${provider.name}`);
        provider.storeDynamicModels(options, models);

        return models;
      })
      .catch((err) => {
        logger.error(`Error getting dynamic models ${provider.name}:`, err);
        return [];
      });

    const staticModels = provider.staticModels || [];
    const dynamicModelsFlat = dynamicModels || [];
    const dynamicModelKeys = dynamicModelsFlat.map((d) => `${d.name}-${d.provider}`);
    const filteredStaticModels = staticModels.filter((m) => !dynamicModelKeys.includes(`${m.name}-${m.provider}`));

    // Combine static and dynamic models
    const modelList = [...dynamicModelsFlat, ...filteredStaticModels];
    modelList.sort((a, b) => a.name.localeCompare(b.name));
    this._modelList = modelList;

    return modelList;
  }

  async getModelListFromProvider(
    providerArg: BaseProvider,
    options: {
      apiKeys?: Record<string, string>;
      providerSettings?: Record<string, IProviderSetting>;
      serverEnv?: Record<string, string>;
    },
  ): Promise<ModelInfo[]> {
    const provider = this._providers.get(providerArg.name);

    if (!provider) {
      throw new Error(`Provider ${providerArg.name} not found`);
    }

    const staticModels = provider.staticModels || [];

    if (!provider.getDynamicModels) {
      return staticModels;
    }

    const { apiKeys, serverEnv } = options;

    const cachedModels = provider.getModelsFromCache({
      apiKeys,
      serverEnv,
    });

    if (cachedModels) {
      logger.info(`Found ${cachedModels.length} cached models for ${provider.name}`);
      return [...cachedModels, ...staticModels];
    }

    logger.info(`Getting dynamic models for ${provider.name}`);

    const dynamicModels = await provider
      .getDynamicModels?.(apiKeys, undefined, serverEnv)
      .then((models) => {
        logger.info(`Got ${models.length} dynamic models for ${provider.name}`);
        provider.storeDynamicModels(options, models);

        return models;
      })
      .catch((err) => {
        logger.error(`Error getting dynamic models ${provider.name}:`, err);
        return [];
      });

    const dynamicModelsName = dynamicModels.map((d) => d.name);
    const filteredStaticList = staticModels.filter((m) => !dynamicModelsName.includes(m.name));
    const modelList = [...dynamicModels, ...filteredStaticList];
    modelList.sort((a, b) => a.name.localeCompare(b.name));

    return modelList;
  }

  getStaticModelListFromProvider(providerArg: BaseProvider) {
    const provider = this._providers.get(providerArg.name);

    if (!provider) {
      throw new Error(`Provider ${providerArg.name} not found`);
    }

    return [...(provider.staticModels || [])];
  }

  getDefaultProvider(): BaseProvider {
    const provider = this._providers.get(this._defaultProvider);

    if (!provider) {
      throw new Error(`Default provider ${this._defaultProvider} not found`);
    }

    return provider;
  }

  private _registerDefaultProvider() {
    const allowedProviders = ['Google', 'Anthropic'];
    const providerName = this._defaultProvider;

    if (!allowedProviders.includes(providerName)) {
      throw new Error(`Provider ${providerName} is not allowed. Only Google and Anthropic are supported.`);
    }

    // Look for the default provider in the registry
    for (const exportedItem of Object.values(providers)) {
      if (typeof exportedItem === 'function' && exportedItem.prototype instanceof BaseProvider) {
        const provider = new exportedItem();

        if (provider.name === providerName) {
          this.registerProvider(provider);
          return;
        }
      }
    }

    throw new Error(`Default provider ${providerName} not found in registry`);
  }
}
