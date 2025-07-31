import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '~/lib/services/datasourceService';
import { generateSchemaBasedSuggestions } from '~/lib/services/suggestionService';
import { requireUserId } from '~/auth/session';

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId(request);
    const { dataSourceId } = await request.json<{ dataSourceId: string }>();

    if (!dataSourceId) {
      return NextResponse.json({ success: false, error: 'Data source ID is required' }, { status: 400 });
    }

    // Fetch the data source using the service
    const dataSource = await getDataSource(dataSourceId, userId);

    if (!dataSource) {
      return NextResponse.json({ success: false, error: 'Data source not found' }, { status: 404 });
    }

    // Check if it's the sample database
    const isSampleDatabase = dataSource.connectionString === 'sqlite://sample.db';

    let suggestions: string[];

    if (isSampleDatabase) {
      suggestions = ['create a revenue dashboard', 'build a sales table'];
    } else {
      // Generate schema-based suggestions for non-sample databases
      suggestions = await generateSchemaBasedSuggestions(dataSource);
    }

    return NextResponse.json({
      success: true,
      suggestions,
    });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate suggestions' }, { status: 500 });
  }
}
