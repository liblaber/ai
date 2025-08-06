import { LLMManager } from '~/lib/modules/llm/manager';

const llmManager = LLMManager.getInstance();

export const DEFAULT_PROVIDER = llmManager.getProvider();
export const DEFAULT_MODEL = llmManager.defaultModel;
