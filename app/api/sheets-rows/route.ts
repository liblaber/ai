import { NextRequest, NextResponse } from 'next/server';
import { requireUserAbility } from '~/auth/session';

// In-memory storage for row mappings (in production, this should be Redis or similar)
const rowMappings = new Map<string, Map<string, { rowIndex: number; data: any; spreadsheetId: string }>>();

// Helper to generate a unique key for a row based on its data
function generateRowKey(data: any): string {
  // Create a hash-like key from the data to identify unique rows
  const sortedKeys = Object.keys(data)
    .filter((k) => !['id', '_id'].includes(k))
    .sort();
  const values = sortedKeys.map((k) => String(data[k] || '').trim()).join('|');

  return Buffer.from(values).toString('base64').substring(0, 16);
}

// Helper to get user-specific mapping
function getUserRowMapping(userId: string) {
  if (!rowMappings.has(userId)) {
    rowMappings.set(userId, new Map());
  }

  return rowMappings.get(userId)!;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireUserAbility(request);
    const body = (await request.json()) as {
      action: 'register' | 'lookup' | 'update' | 'delete' | 'list';
      data?: any;
      rowIndex?: number;
      spreadsheetId?: string;
      rowKey?: string;
    };

    const userMapping = getUserRowMapping(userId);

    switch (body.action) {
      case 'register': {
        if (!body.data || !body.spreadsheetId || body.rowIndex === undefined) {
          return NextResponse.json({ success: false, error: 'Missing required fields for register' }, { status: 400 });
        }

        const rowKey = generateRowKey(body.data);
        userMapping.set(rowKey, {
          rowIndex: body.rowIndex,
          data: body.data,
          spreadsheetId: body.spreadsheetId,
        });

        return NextResponse.json({
          success: true,
          rowKey,
        });
      }

      case 'lookup': {
        if (!body.data) {
          return NextResponse.json({ success: false, error: 'Missing data for lookup' }, { status: 400 });
        }

        const rowKey = generateRowKey(body.data);
        const mapping = userMapping.get(rowKey);

        if (!mapping) {
          return NextResponse.json(
            {
              success: false,
              error: 'Row mapping not found',
            },
            { status: 404 },
          );
        }

        return NextResponse.json({
          success: true,
          mapping: {
            rowKey,
            rowIndex: mapping.rowIndex,
            spreadsheetId: mapping.spreadsheetId,
            originalData: mapping.data,
          },
        });
      }

      case 'update': {
        if (!body.data || !body.rowKey) {
          return NextResponse.json({ success: false, error: 'Missing data or rowKey for update' }, { status: 400 });
        }

        const mapping = userMapping.get(body.rowKey);

        if (!mapping) {
          return NextResponse.json({ success: false, error: 'Row mapping not found for update' }, { status: 404 });
        }

        // Update the stored data
        mapping.data = { ...mapping.data, ...body.data };

        return NextResponse.json({
          success: true,
          mapping: {
            rowKey: body.rowKey,
            rowIndex: mapping.rowIndex,
            spreadsheetId: mapping.spreadsheetId,
            updatedData: mapping.data,
          },
        });
      }

      case 'delete': {
        if (!body.rowKey) {
          return NextResponse.json({ success: false, error: 'Missing rowKey for delete' }, { status: 400 });
        }

        const mapping = userMapping.get(body.rowKey);

        if (!mapping) {
          return NextResponse.json({ success: false, error: 'Row mapping not found for delete' }, { status: 404 });
        }

        const deletedMapping = { ...mapping };
        userMapping.delete(body.rowKey);

        return NextResponse.json({
          success: true,
          deletedMapping: {
            rowKey: body.rowKey,
            rowIndex: deletedMapping.rowIndex,
            spreadsheetId: deletedMapping.spreadsheetId,
          },
        });
      }

      case 'list': {
        const mappings = Array.from(userMapping.entries()).map(([key, value]) => ({
          rowKey: key,
          rowIndex: value.rowIndex,
          spreadsheetId: value.spreadsheetId,
          data: value.data,
        }));

        return NextResponse.json({
          success: true,
          mappings,
          count: mappings.length,
        });
      }

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[RowMapping] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Row mapping operation failed' },
      { status: 500 },
    );
  }
}
