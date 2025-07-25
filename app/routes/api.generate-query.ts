import { getDatabaseSchema } from '~/lib/schema';
import { type ActionFunction, json } from '@remix-run/cloudflare';
import { generateSqlQueries } from '~/lib/.server/llm/database-source';
import { createScopedLogger } from '~/utils/logger';
import { z } from 'zod';
import { getLlm } from '~/lib/.server/llm/get-llm';
import { prisma } from '~/lib/prisma';
import { requireUserId } from '~/auth/session';

const logger = createScopedLogger('generate-sql');

const requestSchema = z.object({
  prompt: z.string(),
  existingQuery: z.string().optional(),
  dataSourceId: z.string(),
});

export const action: ActionFunction = async ({ request }) => {
  const userId = await requireUserId(request);

  try {
    const body = await request.json();
    const { prompt, existingQuery, dataSourceId } = requestSchema.parse(body);
    const existingQueries = existingQuery ? [existingQuery] : [];

    const schema = await getDatabaseSchema(dataSourceId, userId);

    const llm = await getLlm();

    const dataSource = await prisma.dataSource.findUniqueOrThrow({
      where: { id: dataSourceId, userId },
    });

    const connectionDetails = new URL(dataSource.connectionString);
    const type = connectionDetails.protocol.replace(':', '');

    const queries = await generateSqlQueries(schema, prompt, llm, type, undefined, existingQueries);

    if (!queries || queries.length === 0) {
      return json({ error: 'Failed to generate SQL query' }, { status: 500 });
    }

    return json(queries[0].query);
  } catch (error) {
    logger.error('Error generating SQL:', error);
    return json({ error: error instanceof Error ? error.message : 'Failed to generate SQL query' }, { status: 500 });
  }
};
