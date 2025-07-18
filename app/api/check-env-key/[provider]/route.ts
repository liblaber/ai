import { NextRequest, NextResponse } from 'next/server';
import { LLMManager } from '~/lib/modules/llm/manager';

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const llmManager = LLMManager.getInstance();
  const provider = llmManager.getProvider();
  const { provider: providerName } = await params;

  if (provider.name !== providerName) {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
  }

  const envVarName = provider.config.apiTokenKey;

  if (!envVarName) {
    return NextResponse.json(
      { error: 'No API key environment variable configured for this provider' },
      { status: 400 },
    );
  }

  /*
   * Check for API key in the following order:
   * 1. Process environment variables (NextJS)
   * 2. LLMManager environment variables
   */
  const apiKey = process?.env?.[envVarName] || llmManager.env[envVarName];

  return NextResponse.json({ hasKey: !!apiKey });
}
