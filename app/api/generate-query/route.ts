import { getDatabaseSchema } from '~/lib/schema';
import { NextRequest, NextResponse } from 'next/server';
import { generateSqlQueries, detectDatabaseTypeFromPrompt, type Table } from '~/lib/.server/llm/database-source';
import { createScopedLogger } from '~/utils/logger';
import { z } from 'zod';
import { getLlm } from '~/lib/.server/llm/get-llm';
import { prisma } from '~/lib/prisma';
import { requireUserId } from '~/auth/session';

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

    const llm = await getLlm();
    let schema: Table[];
    let type: string;

    // If dataSourceId is provided, use the existing data source
    if (dataSourceId) {
      schema = await getDatabaseSchema(dataSourceId, userId);

      const dataSource = await prisma.dataSource.findUniqueOrThrow({
        where: { id: dataSourceId, userId },
      });

      const connectionDetails = new URL(dataSource.connectionString);
      type = connectionDetails.protocol.replace(':', '');
    } else {
      // Use AI to determine database type from prompt
      const availableTypes = ['postgres', 'mysql', 'sqlite', 'mongodb'];
      const detectedType = suggestedDatabaseType || (await detectDatabaseTypeFromPrompt(prompt, llm, availableTypes));

      if (!detectedType) {
        return NextResponse.json(
          { error: 'Could not determine database type from prompt. Please specify a data source.' },
          { status: 400 },
        );
      }

      type = detectedType;

      console.log(
        `⚠️  WARNING: No dataSourceId provided. Using sample schema for ${type}. Create a data source to query real data.`,
      );

      // For demonstration purposes, create a sample schema based on common patterns
      // In a real implementation, you might want to ask the user to specify their schema
      schema = generateSampleSchema(type);
    }

    const queries = await generateSqlQueries({
      schema,
      userPrompt: prompt,
      llm,
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

function generateSampleSchema(databaseType: string): Table[] {
  // This is a sample schema for demonstration
  // In production, you'd want users to connect their actual databases
  if (databaseType === 'mongodb') {
    return [
      {
        tableName: 'airbnb',
        columns: [
          { name: '_id', type: 'string', isPrimary: true },
          { name: 'name', type: 'string', isPrimary: false },
          { name: 'summary', type: 'string', isPrimary: false },
          {
            name: 'room_type',
            type: 'string',
            isPrimary: false,
            enumValues: ['Entire home/apt', 'Private room', 'Shared room'],
          },
          { name: 'property_type', type: 'string', isPrimary: false },
          { name: 'price', type: 'object', isPrimary: false },
          {
            name: 'amenities',
            type: 'array',
            isPrimary: false,
          },
          { name: 'accommodates', type: 'number', isPrimary: false },
          { name: 'bedrooms', type: 'number', isPrimary: false },
          { name: 'beds', type: 'number', isPrimary: false },
          { name: 'bathrooms', type: 'object', isPrimary: false },
          { name: 'number_of_reviews', type: 'number', isPrimary: false },
          { name: 'host', type: 'object', isPrimary: false },
          { name: 'address', type: 'object', isPrimary: false },
        ],
      },
      {
        tableName: 'reviews',
        columns: [
          { name: '_id', type: 'ObjectId', isPrimary: true },
          { name: 'listing_id', type: 'string', isPrimary: false },
          { name: 'reviewer_id', type: 'string', isPrimary: false },
          { name: 'reviewer_name', type: 'string', isPrimary: false },
          { name: 'comments', type: 'string', isPrimary: false },
          { name: 'date', type: 'Date', isPrimary: false },
        ],
      },
      {
        tableName: 'hosts',
        columns: [
          { name: '_id', type: 'ObjectId', isPrimary: true },
          { name: 'host_id', type: 'string', isPrimary: false },
          { name: 'host_name', type: 'string', isPrimary: false },
          { name: 'host_since', type: 'Date', isPrimary: false },
          { name: 'host_listings_count', type: 'number', isPrimary: false },
        ],
      },
    ];
  } else {
    // SQL databases
    return [
      {
        tableName: 'users',
        columns: [
          { name: 'id', type: 'integer', isPrimary: true },
          { name: 'name', type: 'varchar', isPrimary: false },
          { name: 'email', type: 'varchar', isPrimary: false },
          { name: 'role', type: 'varchar', isPrimary: false },
          { name: 'created_at', type: 'timestamp', isPrimary: false },
        ],
      },
      {
        tableName: 'orders',
        columns: [
          { name: 'id', type: 'integer', isPrimary: true },
          { name: 'user_id', type: 'integer', isPrimary: false },
          { name: 'amount', type: 'decimal', isPrimary: false },
          { name: 'status', type: 'varchar', isPrimary: false },
          { name: 'created_at', type: 'timestamp', isPrimary: false },
        ],
      },
    ];
  }
}
