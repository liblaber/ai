import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '~/lib/services/datasourceService';
import { generateSchemaBasedSuggestions } from '~/lib/services/suggestionService';
import { SAMPLE_DATABASE_NAME } from '@liblab/data-access/accessors/sqlite';
import { logger } from '~/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const { dataSourceId } = await request.json<{ dataSourceId: string }>();

    if (!dataSourceId) {
      return NextResponse.json({ success: false, error: 'Data source ID is required' }, { status: 400 });
    }

    // Fetch the data source using the service
    const dataSource = await getDataSource(dataSourceId);

    if (!dataSource) {
      return NextResponse.json({ success: false, error: 'Data source not found' }, { status: 404 });
    }

    // Check if it's the sample database
    const isSampleDatabase = dataSource.connectionString === `sqlite://${SAMPLE_DATABASE_NAME}`;

    let suggestions: string[];

    if (isSampleDatabase) {
      suggestions = suggestions = [
        'create a revenue dashboard',
        'make user management app',
        'build a sales overview page',
      ];
    } else {
      // Generate schema-based suggestions for non-sample databases
      suggestions = await generateSchemaBasedSuggestions(dataSource);
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
