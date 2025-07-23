import { json } from '@remix-run/cloudflare';
import { LLMManager } from '~/lib/modules/llm/manager';
import type { ProviderInfo } from '~/types/model';

export async function loader() {
  const llmManager = LLMManager.getInstance();
  const provider = llmManager.getProvider();

  const providerInfo: ProviderInfo = {
    name: provider.name,
    getApiKeyLink: provider.getApiKeyLink,
    labelForGetApiKey: provider.labelForGetApiKey,
    icon: provider.icon,
  };

  return json({
    providers: [providerInfo],
    defaultProvider: providerInfo,
  });
}
