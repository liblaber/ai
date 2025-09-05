import { NextRequest, NextResponse } from 'next/server';
import { getEnvironmentDataSource } from '~/lib/services/dataSourceService';
import { generateSchemaBasedSuggestions } from '~/lib/services/suggestionService';
import { logger } from '~/utils/logger';
import { requireUserId } from '~/auth/session';
import { z } from 'zod';

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
