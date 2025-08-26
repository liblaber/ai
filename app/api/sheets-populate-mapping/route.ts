import { NextRequest, NextResponse } from 'next/server';
import { requireUserAbility } from '~/auth/session';

export async function POST(request: NextRequest) {
  try {
    await requireUserAbility(request);

    const body = (await request.json()) as {
      spreadsheetId: string;
      data: any[];
      startRow?: number;
    };

    if (!body.spreadsheetId || !Array.isArray(body.data)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing spreadsheetId or data array',
        },
        { status: 400 },
      );
    }

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

        const result = (await response.json()) as any;

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
    console.error('Row mapping population failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to populate row mappings',
      },
      { status: 500 },
    );
  }
}
