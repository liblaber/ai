import type { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { LanguageModelV1 } from 'ai';
import { LLMManager } from '~/lib/modules/llm/manager';
import { logger } from '~/utils/logger';
import { MAX_TOKENS } from '~/lib/.server/llm/constants';

type Llm = {
  instance: LanguageModelV1;
  details: ModelInfo;
  maxTokens: number;
};

export async function getLlm({
  modelName,
  provider,
  apiKeys,
  serverEnv,
}: {
  modelName: string;
  provider: BaseProvider;
  apiKeys?: Record<string, string>;
  serverEnv?: Env;
}): Promise<Llm> {
  const staticModels = LLMManager.getInstance().getStaticModelListFromProvider(provider);
  let details = staticModels.find((m) => m.name === modelName);

  if (!details) {
    const modelsList = [
      ...(provider.staticModels || []),
      ...(await LLMManager.getInstance().getModelListFromProvider(provider, {
        apiKeys,
        serverEnv: serverEnv as any,
      })),
    ];

    if (!modelsList.length) {
      throw new Error(`No models found for provider ${provider.name}`);
    }

    details = modelsList.find((m) => m.name === modelName);

    if (!details) {
      // Fallback to first model
      logger.warn(
        `MODEL [${modelName}] not found in provider [${provider.name}]. Falling back to first model. ${modelsList[0].name}`,
      );
      details = modelsList[0];
    }
  }

  if (!details) {
    throw new Error(`Could not find any suitable model for provider ${provider.name}`);
  }

  const instance = provider.getModelInstance({
    model: details.name,
    serverEnv,
    apiKeys,
  });
  const maxTokens = details.maxTokenAllowed || MAX_TOKENS;

  return { details, instance, maxTokens };
}
