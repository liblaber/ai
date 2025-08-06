import { env } from '~/env';
import { BaseProvider } from './base-provider';
import * as providers from './registry';

export class LLMManager {
  private static _instance: LLMManager;
  private readonly _env: typeof env.server;
  private readonly _defaultModel: string;
  private readonly _defaultProvider: string;
  private _provider: BaseProvider | null = null;

  get env() {
    return this._env;
  }

  get defaultModel(): string {
    return this._defaultModel;
  }

  private constructor() {
    this._env = env.server;
    this._defaultModel = env.server.DEFAULT_LLM_MODEL;
    this._defaultProvider = env.server.DEFAULT_LLM_PROVIDER;
    this._initializeProvider();
  }

  static getInstance(): LLMManager {
    if (!LLMManager._instance) {
      LLMManager._instance = new LLMManager();
    }

    return LLMManager._instance;
  }

  getProvider(): BaseProvider {
    if (!this._provider) {
      throw new Error(`Provider ${this._defaultProvider} not initialized`);
    }

    return this._provider;
  }

  private _initializeProvider() {
    const providerName = this._defaultProvider;
    const availableProviders: string[] = [];

    // Look for the provider in the registry
    for (const exportedItem of Object.values(providers)) {
      if (typeof exportedItem === 'function' && exportedItem.prototype instanceof BaseProvider) {
        const provider = new exportedItem();
        availableProviders.push(provider.name);

        if (provider.name === providerName) {
          this._provider = provider;
          return;
        }
      }
    }

    const availableProvidersList = availableProviders.sort().join(', ');
    throw new Error(
      `The provider "${providerName}" set in DEFAULT_LLM_PROVIDER environment variable is invalid.\n\nPlease use one of the available providers: \n\n${availableProvidersList}`,
    );
  }
}
