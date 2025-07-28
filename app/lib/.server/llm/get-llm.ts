import type { LanguageModelV1 } from 'ai';
import { LLMManager } from '~/lib/modules/llm/manager';
import { getMaxTokens } from '~/lib/.server/llm/constants';

export type Llm = {
  instance: LanguageModelV1;
  maxOutputTokens: number;
};

export async function getLlm(): Promise<Llm> {
  const llmManager = LLMManager.getInstance();
  const provider = llmManager.getProvider();
  const modelName = llmManager.defaultModel;

  const instance = provider.getModelInstance({
    model: modelName,
    serverEnv: process.env as any,
  });

  return { instance, maxOutputTokens: getMaxTokens(provider.name, modelName) };
}
