import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '~/auth/session';
import { GoogleSheetsAccessor } from '@liblab/data-access/accessors/google-sheets';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('sheets-spreadsheet');

export async function GET(request: NextRequest, { params }: { params: Promise<{ spreadsheetId: string }> }) {
  try {
    await requireUserId(request);

    const { spreadsheetId } = await params;
    const { searchParams } = new URL(request.url);
    const operation = searchParams.get('operation') || 'readSheet';
    const sheetName = searchParams.get('sheetName') || 'Sheet1';
    const range = searchParams.get('range');

    // Create a Google Sheets accessor instance
    const accessor = new GoogleSheetsAccessor();

    // For operations, use the faster initialization without connection test
    accessor.initializeWithId(spreadsheetId);

    try {
      // Execute the read operation
      const query = JSON.stringify({
        operation,
        parameters: {
          sheetName,
          range,
        },
      });

      const result = await accessor.executeQuery(query);

      await accessor.close();

      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch (error) {
      await accessor.close();
      throw error;
    }
  } catch (error) {
    logger.error('Sheets read error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read spreadsheet',
      },
      { status: 400 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ spreadsheetId: string }> }) {
  try {
    await requireUserId(request);

    const { spreadsheetId } = await params;
    const body = (await request.json()) as {
      operation?: string;
      parameters?: any;
    };
    const { operation, parameters } = body;

    if (!operation) {
      return NextResponse.json({ success: false, error: 'Operation is required' }, { status: 400 });
    }

    // Create a Google Sheets accessor instance
    const accessor = new GoogleSheetsAccessor();

    // For operations, use the faster initialization without connection test
    accessor.initializeWithId(spreadsheetId);

    try {
      // Execute the write operation
      const query = JSON.stringify({
        operation,
        parameters: parameters || {},
      });

      const result = await accessor.executeQuery(query);

      await accessor.close();

      return NextResponse.json({
        success: true,
        result,
      });
    } catch (error) {
      await accessor.close();
      throw error;
    }
  } catch (error) {
    logger.error('Sheets update error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update spreadsheet',
      },
      { status: 400 },
    );
  }
}
