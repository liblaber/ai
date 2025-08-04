import { NextRequest, NextResponse } from 'next/server';
import { LLMManager } from '~/lib/modules/llm/manager';
import { env } from '~/env/client';

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

  if (!(envVarName in env)) {
    return NextResponse.json({ error: `Environment variable ${envVarName} not found` }, { status: 400 });
  }

  /*
   * Check for API key in the following order:
   * 1. Process environment variables (NextJS)
   * 2. LLMManager environment variables
   */
  const fixedEnvVarName = envVarName as keyof typeof env;
  const apiKey = env[fixedEnvVarName];

  return NextResponse.json({ hasKey: !!apiKey });
}
