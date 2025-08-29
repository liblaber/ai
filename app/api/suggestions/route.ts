import { NextRequest, NextResponse } from 'next/server';
import { getEnvironmentDataSource } from '~/lib/services/dataSourceService';
import { generateSchemaBasedSuggestions } from '~/lib/services/suggestionService';
import { logger } from '~/utils/logger';
import { requireUserId } from '~/auth/session';

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

    let suggestions: string[];

    try {
      // Generate schema-based suggestions using the new service signature
      suggestions = await generateSchemaBasedSuggestions(dataSourceId, userId, environmentId);
    } catch (error) {
      // Fallback to sample suggestions if there's an error
      logger.warn('Failed to generate schema-based suggestions, using fallback:', error);
      suggestions = ['create a revenue dashboard', 'make user management app', 'build a sales overview page'];
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
