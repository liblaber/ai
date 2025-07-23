import { getDatabaseSchema } from '~/lib/schema';
import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: NextRequest) {
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

    const queries = await generateSqlQueries(schema, prompt, llm.instance, type, existingQueries);

    if (!queries || queries.length === 0) {
      return NextResponse.json({ error: 'Failed to generate SQL query' }, { status: 500 });
    }

    return NextResponse.json(queries[0].query);
  } catch (error) {
    logger.error('Error generating SQL:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate SQL query' },
      { status: 500 },
    );
  }
}
