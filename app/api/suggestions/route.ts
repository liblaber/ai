import { NextRequest, NextResponse } from 'next/server';
import { getEnvironmentDataSource } from '~/lib/services/dataSourceService';
import { generateSchemaBasedSuggestions } from '~/lib/services/suggestionService';
import { requireUserId } from '~/auth/session';
import { SAMPLE_DATABASE_NAME } from '@liblab/data-access/accessors/sqlite';
import { logger } from '~/utils/logger';
import { DataSourcePropertyType } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId(request);
    const { dataSourceId, environmentId } = await request.json<{ dataSourceId: string; environmentId: string }>();

    if (!dataSourceId) {
      return NextResponse.json({ success: false, error: 'Data source ID is required' }, { status: 400 });
    }

    if (!environmentId) {
      return NextResponse.json({ success: false, error: 'Environment ID is required' }, { status: 400 });
    }

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
        id: environmentDataSource.dataSource.id,
        name: environmentDataSource.dataSource.name,
        connectionString: connectionUrl || '',
        environmentId: environmentDataSource.environmentId,
        environmentName: environmentDataSource.environment.name,
        createdAt: environmentDataSource.dataSource.createdAt,
        updatedAt: environmentDataSource.dataSource.updatedAt,
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
