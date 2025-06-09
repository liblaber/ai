import { json } from '@remix-run/cloudflare';
import { LLMManager } from '~/lib/modules/llm/manager';
import type { ProviderInfo } from '~/types/model';

export async function loader() {
  const llmManager = LLMManager.getInstance();
  const provider = llmManager.getProvider();

  const providerInfo: ProviderInfo = {
    name: provider.name,
    staticModels: provider.staticModels,
    getApiKeyLink: provider.getApiKeyLink,
    labelForGetApiKey: provider.labelForGetApiKey,
    icon: provider.icon,
  };

  return json({
    modelList: provider.staticModels,
    providers: [providerInfo],
    defaultProvider: providerInfo,
  });
}
