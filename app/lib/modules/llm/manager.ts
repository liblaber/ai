import { BaseProvider } from './base-provider';
import * as providers from './registry';
import { env } from '~/lib/config/env';

export class LLMManager {
  private static _instance: LLMManager;
  private readonly _env: Record<string, string>;
  private readonly _defaultModel: string;
  private readonly _defaultProvider: string;
  private _provider: BaseProvider | null = null;

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
    this._initializeProvider();
  }

  static getInstance(): LLMManager {
    if (!LLMManager._instance) {
      LLMManager._instance = new LLMManager(env as Record<string, string>);
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

    // Look for the provider in the registry
    for (const exportedItem of Object.values(providers)) {
      if (typeof exportedItem === 'function' && exportedItem.prototype instanceof BaseProvider) {
        const provider = new exportedItem();

        if (provider.name === providerName) {
          this._provider = provider;
          return;
        }
      }
    }

    throw new Error(`Provider ${providerName} not found in registry`);
  }
}
