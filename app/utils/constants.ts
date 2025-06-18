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
export const PROMPT_COOKIE_KEY = 'cachedPrompt';
export const DATA_SOURCE_ID_REGEX = /\[DataSourceId: (.*?)\]\n\n/;
export const FILES_REGEX = /\[Files: (.*?)\]\n\n/;

export enum MessageRole {
  User = 'user',
  System = 'system',
  Assistant = 'assistant',
}

const llmManager = LLMManager.getInstance();

export const DEFAULT_PROVIDER = llmManager.getProvider();
export const DEFAULT_MODEL = llmManager.defaultModel;
