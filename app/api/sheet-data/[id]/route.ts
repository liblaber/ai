import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '~/auth/session';
import { GoogleSheetsAccessor } from '@liblab/data-access/accessors/google-sheets';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUserId(request);

    const { id } = await params;

    if (!id || id === 'undefined') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid spreadsheet ID',
          details: 'Spreadsheet ID is required for this operation',
        },
        { status: 400 },
      );
    }

    const body = (await request.json()) as {
      operation?: string;
      parameters?: any;
      range?: string;
      values?: any[][];
    };

    // Extract parameters - handle both direct parameters and nested structure
    const operation = body.operation || 'updateValues';
    const range = body.range || body.parameters?.range;
    const values = body.values || body.parameters?.values;
    const parameters = body.parameters || { range, values, valueInputOption: 'USER_ENTERED' };

    if (!parameters.range) {
      return NextResponse.json(
        {
          success: false,
          error: 'Range parameter is required',
          details: 'Range parameter must be specified in request',
        },
        { status: 400 },
      );
    }

    if (parameters.range.includes('undefined') || parameters.range.includes('NaN')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid range format',
          details: 'Range contains invalid values',
        },
        { status: 400 },
      );
    }

    // Create a Google Sheets accessor instance
    const accessor = new GoogleSheetsAccessor();

    // For operations, use the faster initialization without connection test
    accessor.initializeWithId(id);

    try {
      // Execute the update operation
      const query = JSON.stringify({
        operation,
        parameters,
      });

      const result = await accessor.executeQuery(query);

      await accessor.close();

      return NextResponse.json({
        success: true,
        result,
        message: 'Operation completed successfully',
      });
    } catch (error) {
      await accessor.close();
      throw error;
    }
  } catch (error) {
    console.error('Sheet-data update error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update sheet data',
        message: 'Operation failed',
      },
      { status: 500 },
    );
  }
}
