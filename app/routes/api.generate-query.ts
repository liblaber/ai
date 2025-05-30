import { getDatabaseSchema } from '~/lib/schema';
import { type ActionFunction, json } from '@remix-run/cloudflare';
import { generateSqlQueries } from '~/lib/.server/llm/database-source';
import { createScopedLogger } from '~/utils/logger';
import { z } from 'zod';
import { LLMManager } from '~/lib/modules/llm/manager';
import { parseCookies } from '~/lib/api/cookies';
import { DEFAULT_MODEL } from '~/utils/constants';
import { getLlm } from '~/lib/.server/llm/get-llm';

const logger = createScopedLogger('generate-sql');
const llmManager = LLMManager.getInstance(import.meta.env);

const requestSchema = z.object({
  prompt: z.string(),
  existingQuery: z.string().optional(),
});

export const action: ActionFunction = async ({ request }) => {
  try {
    const body = await request.json();
    const { prompt, existingQuery } = requestSchema.parse(body);
    const existingQueries = existingQuery ? [existingQuery] : [];

    const schema = await getDatabaseSchema('unused');

    const cookieHeader = request.headers.get('Cookie');
    const apiKeys = JSON.parse(parseCookies(cookieHeader || '').apiKeys || '{}');

    const llm = await getLlm({
      modelName: DEFAULT_MODEL,
      provider: llmManager.getDefaultProvider(),
      apiKeys,
    });

    const queries = await generateSqlQueries(schema, prompt, llm.instance, llm.maxTokens, existingQueries);

    if (!queries || queries.length === 0) {
      return json({ error: 'Failed to generate SQL query' }, { status: 500 });
    }

    return json(queries[0].query);
  } catch (error) {
    logger.error('Error generating SQL:', error);
    return json({ error: error instanceof Error ? error.message : 'Failed to generate SQL query' }, { status: 500 });
  }
};
