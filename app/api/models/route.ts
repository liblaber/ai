import { NextResponse } from 'next/server';
import { LLMManager } from '~/lib/modules/llm/manager';
import type { ProviderInfo } from '~/types/model';

export async function GET() {
  const llmManager = LLMManager.getInstance();
  const provider = llmManager.getProvider();

  const providerInfo: ProviderInfo = {
    name: provider.name,
    getApiKeyLink: provider.getApiKeyLink,
    labelForGetApiKey: provider.labelForGetApiKey,
  };

  return NextResponse.json({
    providers: [providerInfo],
    defaultProvider: providerInfo,
  });
}
