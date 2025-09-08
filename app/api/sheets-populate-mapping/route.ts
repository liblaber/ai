import { NextRequest, NextResponse } from 'next/server';
import { requireUserAbility } from '~/auth/session';
import { z } from 'zod';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('sheets-populate-mapping');

const sheetsPopulateRequestSchema = z.object({
  spreadsheetId: z.string().min(1, 'Spreadsheet ID is required'),
  data: z.array(z.unknown()).min(1, 'Data array must not be empty'),
  startRow: z.number().int().positive().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await requireUserAbility(request);

    const rawBody = await request.json();
    const body = sheetsPopulateRequestSchema.parse(rawBody);

    const registrationPromises = body.data.map(async (rowData, index) => {
      const rowIndex = (body.startRow || 1) + index; // Default start row is 1 (after headers)

      try {
        const response = await fetch(new URL('/api/sheets-rows', request.url), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: request.headers.get('Authorization') || '',
            Cookie: request.headers.get('Cookie') || '',
          },
          body: JSON.stringify({
            action: 'register',
            data: rowData,
            rowIndex,
            spreadsheetId: body.spreadsheetId,
          }),
        });

        interface SheetsRowsResponse {
          success: boolean;
          rowKey?: string;
          error?: string;
        }

        const result = (await response.json()) as SheetsRowsResponse;

        if (result.success) {
          return {
            success: true,
            rowIndex,
            rowKey: result.rowKey,
          };
        } else {
          return {
            success: false,
            rowIndex,
            error: result.error,
          };
        }
      } catch (error) {
        return {
          success: false,
          rowIndex,
          error: error instanceof Error ? error.message : 'Registration failed',
        };
      }
    });

    const results = await Promise.all(registrationPromises);

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    return NextResponse.json({
      success: true,
      results: {
        total: body.data.length,
        successful: successful.length,
        failed: failed.length,
      },
    });
  } catch (error) {
    logger.error('Row mapping population failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to populate row mappings',
      },
      { status: 500 },
    );
  }
}
