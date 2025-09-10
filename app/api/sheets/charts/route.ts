import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '~/auth/session';
import { GoogleSheetsAccessor } from '@liblab/data-access/accessors/google-sheets';
import { getDataSourceConnectionUrl, getEnvironmentDataSource } from '~/lib/services/datasourceService';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('sheets-charts');

export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId(request);
    const { searchParams } = new URL(request.url);

    const dataSourceId = searchParams.get('dataSourceId');
    const environmentId = searchParams.get('environmentId');
    const chartType = searchParams.get('chartType') || 'data';

    if (!dataSourceId || !environmentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: dataSourceId and environmentId',
        },
        { status: 400 },
      );
    }

    // Get the data source with properties
    const environmentDataSource = await getEnvironmentDataSource(dataSourceId, userId, environmentId);

    if (!environmentDataSource) {
      return NextResponse.json(
        {
          success: false,
          error: 'Data source not found or access denied',
        },
        { status: 404 },
      );
    }

    // Get connection URL (this will include OAuth tokens if available)
    const connectionUrl = await getDataSourceConnectionUrl(userId, dataSourceId, environmentId);

    if (!connectionUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Could not establish connection to data source',
        },
        { status: 400 },
      );
    }

    // Create Google Sheets accessor and initialize with connection URL
    const accessor = new GoogleSheetsAccessor();

    try {
      await accessor.initialize(connectionUrl);

      // Get chart data based on chart type
      let query: string;

      switch (chartType) {
        case 'summary':
          // Get basic sheet information
          query = JSON.stringify({
            operation: 'getAllSheets',
            parameters: {},
          });
          break;

        case 'data':
        default:
          // Get sample data for charts
          query = JSON.stringify({
            operation: 'readSheetPaginated',
            parameters: {
              maxRows: 100,
              valueRenderOption: 'FORMATTED_VALUE',
            },
          });
          break;
      }

      const result = await accessor.executeQuery(query);

      await accessor.close();

      return NextResponse.json({
        success: true,
        data: result,
        chartType,
        dataSource: {
          id: dataSourceId,
          name: environmentDataSource.dataSource.name,
          type: environmentDataSource.dataSource.type,
        },
      });
    } catch (error) {
      await accessor.close();
      throw error;
    }
  } catch (error) {
    logger.error('Charts data error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch chart data',
      },
      { status: 500 },
    );
  }
}
