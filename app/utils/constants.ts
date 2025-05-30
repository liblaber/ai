import { LLMManager } from '~/lib/modules/llm/manager';

export const WORK_DIR_NAME = 'project';
export const WORK_DIR = `/home/${WORK_DIR_NAME}`;
export const MODIFICATIONS_TAG_NAME = 'liblab_file_modifications';
export const MODEL_REGEX = /^\[Model: (.*?)\]\n\n/;
export const PROVIDER_REGEX = /\[Provider: (.*?)\]\n\n/;
export const SQL_MODEL_REGEX = /\[SqlModel: (.*?)\]\n\n/;
export const SQL_PROVIDER_REGEX = /\[SqlProvider: (.*?)\]\n\n/;
export const FIRST_USER_MESSAGE_REGEX = /\[FirstUserMessage: (.*?)\]\n\n/;
export const ASK_LIBLAB_REGEX = /\[AskLiblab: (.*?)\]\n\n/;
export const DEFAULT_MODEL = 'claude-3-5-sonnet-latest';
export const PROMPT_COOKIE_KEY = 'cachedPrompt';
export const DATA_SOURCE_ID_REGEX = /\[DataSourceId: (.*?)\]\n\n/;

export enum MessageRole {
  User = 'user',
  System = 'system',
  Assistant = 'assistant',
}

const llmManager = LLMManager.getInstance(import.meta.env);

export const PROVIDER_LIST = llmManager.getAllProviders();
export const DEFAULT_PROVIDER = llmManager.getDefaultProvider();

export const providerBaseUrlEnvKeys: Record<string, { baseUrlKey?: string; apiTokenKey?: string }> = {};
PROVIDER_LIST.forEach((provider) => {
  providerBaseUrlEnvKeys[provider.name] = {
    baseUrlKey: provider.config.baseUrlKey,
    apiTokenKey: provider.config.apiTokenKey,
  };
});
