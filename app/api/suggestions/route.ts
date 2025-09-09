import { NextRequest, NextResponse } from 'next/server';
import { getEnvironmentDataSource } from '~/lib/services/datasourceService';
import { generateSchemaBasedSuggestions } from '~/lib/services/suggestionService';
import { SAMPLE_DATABASE_NAME } from '@liblab/data-access/accessors/sqlite';
import { logger } from '~/utils/logger';
import { requireUserId } from '~/auth/session';
import { z } from 'zod';
import { DataSourcePropertyType } from '@prisma/client';
import type { DataSourceType } from '@liblab/data-access/utils/types';

const suggestionsRequestSchema = z.object({
  dataSourceId: z.string().min(1, 'Data source ID is required'),
  environmentId: z.string().min(1, 'Environment ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId(request);
    const body = await request.json();

    const validationResult = suggestionsRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.errors[0]?.message || 'Invalid request data' },
        { status: 400 },
      );
    }

    const { dataSourceId, environmentId } = validationResult.data;

    // Fetch the environment data source using the service
    const environmentDataSource = await getEnvironmentDataSource(dataSourceId, userId, environmentId);

    if (!environmentDataSource) {
      return NextResponse.json({ success: false, error: 'Data source not found' }, { status: 404 });
    }

    const dataSourceProperty = environmentDataSource.dataSourceProperties.find(
      (dsp) => dsp.type === DataSourcePropertyType.CONNECTION_URL,
    );

    if (!dataSourceProperty) {
      return NextResponse.json({ success: false, error: 'Data source property not found' }, { status: 404 });
    }

    const connectionUrl = dataSourceProperty.environmentVariable.value;

    const isSampleDatabase = connectionUrl === `sqlite://${SAMPLE_DATABASE_NAME}`;

    let suggestions: string[];

    if (isSampleDatabase) {
      suggestions = suggestions = [
        'create a revenue dashboard',
        'make user management app',
        'build a sales overview page',
      ];
    } else {
      // Generate schema-based suggestions for non-sample databases
      // Create a compatible dataSource object for the suggestion service
      const dataSourceForSuggestions = {
        dataSourceId: environmentDataSource.dataSource.id,
        connectionString: connectionUrl || '',
        dataSourceType: environmentDataSource.dataSource.type as DataSourceType,
      };
      suggestions = await generateSchemaBasedSuggestions(dataSourceForSuggestions);
    }

    return NextResponse.json({
      success: true,
      suggestions,
    });
  } catch (error) {
    logger.error('Error generating suggestions:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate suggestions' }, { status: 500 });
  }
}
