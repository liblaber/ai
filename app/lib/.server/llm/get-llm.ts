import type { ModelInfo } from '~/lib/modules/llm/types';
import type { LanguageModelV1 } from 'ai';
import { LLMManager } from '~/lib/modules/llm/manager';
import { MAX_TOKENS } from '~/lib/.server/llm/constants';

type Llm = {
  instance: LanguageModelV1;
  details: ModelInfo;
  maxTokens: number;
};

export async function getLlm(): Promise<Llm> {
  const llmManager = LLMManager.getInstance();
  const provider = llmManager.getProvider();
  const modelName = llmManager.defaultModel;

  const details = provider.staticModels.find((m) => m.name === modelName);

  if (!details) {
    throw new Error(`Model ${modelName} not found in provider ${provider.name}`);
  }

  const instance = provider.getModelInstance({
    model: details.name,
    serverEnv: process.env as any,
  });
  const maxTokens = details.maxTokenAllowed || MAX_TOKENS;

  return { details, instance, maxTokens };
}
