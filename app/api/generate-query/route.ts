import { getDatabaseSchema } from '~/lib/schema';
import { NextRequest, NextResponse } from 'next/server';
import { generateSqlQueries, detectDatabaseTypeFromPrompt, type Table } from '~/lib/.server/llm/database-source';
import { createScopedLogger } from '~/utils/logger';
import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { requireUserId } from '~/auth/session';
import { getConnectionProtocol } from '@liblab/data-access/utils/connection';
import { DataAccessor } from '@liblab/data-access/dataAccessor';

const logger = createScopedLogger('generate-sql');

const requestSchema = z.object({
  prompt: z.string(),
  existingQuery: z.string().optional(),
  dataSourceId: z.string().optional(),
  suggestedDatabaseType: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const userId = await requireUserId(request);

  try {
    const body = await request.json();
    const { prompt, existingQuery, dataSourceId, suggestedDatabaseType } = requestSchema.parse(body);
    const existingQueries = existingQuery ? [existingQuery] : [];

    let schema: Table[];
    let type: string;

    // If dataSourceId is provided, use the existing data source
    if (dataSourceId) {
      schema = await getDatabaseSchema(dataSourceId, userId);

      const dataSource = await prisma.dataSource.findUniqueOrThrow({
        where: { id: dataSourceId, createdById: userId },
      });

      type = getConnectionProtocol(dataSource.connectionString);
    } else {
      // Use AI to determine database type from prompt
      const availableTypes = DataAccessor.getAvailableDatabaseTypes();
      const detectedType = suggestedDatabaseType || (await detectDatabaseTypeFromPrompt(prompt, availableTypes));

      if (!detectedType) {
        return NextResponse.json(
          { error: 'Could not determine database type from prompt. Please specify a data source.' },
          { status: 400 },
        );
      }

      type = detectedType;

      logger.warn(
        `⚠️  WARNING: No dataSourceId provided. Using sample schema for ${type}. Create a data source to query real data.`,
      );

      // For demonstration purposes, create a sample schema based on common patterns
      // In a real implementation, you might want to ask the user to specify their schema
      const sampleSchema = DataAccessor.getSampleSchema(type);

      if (!sampleSchema) {
        return NextResponse.json({ error: 'Unsupported database type' }, { status: 400 });
      }

      schema = sampleSchema;
    }

    const queries = await generateSqlQueries({
      schema,
      userPrompt: prompt,
      databaseType: type,
      existingQueries,
    });

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
