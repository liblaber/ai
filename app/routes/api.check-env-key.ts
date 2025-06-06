import { json } from '@remix-run/cloudflare';
import { LLMManager } from '~/lib/modules/llm/manager';

export async function loader({ context, params }: { context: any; params: { provider: string } }) {
  const llmManager = LLMManager.getInstance();
  const provider = llmManager.getProvider();

  if (provider.name !== params.provider) {
    return json({ error: 'Provider not found' }, { status: 404 });
  }

  const envVarName = provider.config.apiTokenKey;

  if (!envVarName) {
    return json({ error: 'No API key environment variable configured for this provider' }, { status: 400 });
  }

  /*
   * Check for API key in the following order:
   * 1. Cloudflare environment variables
   * 2. Process environment variables
   * 3. LLMManager environment variables
   */
  const apiKey = context?.cloudflare?.env?.[envVarName] || process?.env?.[envVarName] || llmManager.env[envVarName];

  return json({ hasKey: !!apiKey });
}
