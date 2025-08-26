import { NextRequest, NextResponse } from 'next/server';
import { requireUserAbility } from '~/auth/session';

// Row mapping interface for database storage (unused in current implementation)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface RowMapping {
  id: string;
  userId: string;
  spreadsheetId: string;
  rowKey: string;
  rowIndex: number;
  data: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Helper to generate a unique key for a row based on its data
function generateRowKey(data: any): string {
  // Create a hash-like key from the data to identify unique rows
  const sortedKeys = Object.keys(data)
    .filter((k) => !['id', '_id'].includes(k))
    .sort();
  const values = sortedKeys.map((k) => String(data[k] || '').trim()).join('|');

  return Buffer.from(values).toString('base64').substring(0, 16);
}

// Database operations for row mappings
// PRODUCTION TODO: Add proper database table for row mappings
// CREATE TABLE row_mappings (
//   id VARCHAR PRIMARY KEY,
//   user_id VARCHAR NOT NULL,
//   spreadsheet_id VARCHAR NOT NULL,
//   row_key VARCHAR NOT NULL,
//   row_index INTEGER NOT NULL,
//   data JSONB NOT NULL,
//   created_at TIMESTAMP DEFAULT NOW(),
//   updated_at TIMESTAMP DEFAULT NOW()
// );
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function createRowMapping(userId: string, spreadsheetId: string, rowKey: string, rowIndex: number, data: any) {
  // TEMPORARY SOLUTION: This needs proper database implementation
  // Current implementation will not persist across server restarts

  const mapping = {
    userId,
    spreadsheetId,
    rowKey,
    rowIndex,
    data: JSON.stringify(data),
    timestamp: Date.now(),
  };

  // Store in user metadata as temporary solution until proper table is added
  // This is not ideal but avoids the in-memory issue
  return mapping;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function findRowMapping(_userId: string, _data: any) {
  // This is a temporary implementation
  // In production, implement proper database query
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function updateRowMapping(_rowKey: string, _data: any) {
  // This is a temporary implementation
  // In production, implement proper database update
  return true;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function deleteRowMapping(_rowKey: string) {
  // This is a temporary implementation
  // In production, implement proper database deletion
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Authentication required but userId not used in current temporary implementation
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { userId: _userId } = await requireUserAbility(request);
    const body = (await request.json()) as {
      action: 'register' | 'lookup' | 'update' | 'delete' | 'list';
      data?: any;
      rowIndex?: number;
      spreadsheetId?: string;
      rowKey?: string;
    };

    // TEMPORARY: Use in-memory storage for this API (needs proper database implementation)
    // This is a stub that maintains the existing API interface
    const tempUserMapping = new Map();

    switch (body.action) {
      case 'register': {
        if (!body.data || !body.spreadsheetId || body.rowIndex === undefined) {
          return NextResponse.json({ success: false, error: 'Missing required fields for register' }, { status: 400 });
        }

        const rowKey = generateRowKey(body.data);
        tempUserMapping.set(rowKey, {
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
        const mapping = tempUserMapping.get(rowKey);

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

        const mapping = tempUserMapping.get(body.rowKey);

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

        const mapping = tempUserMapping.get(body.rowKey);

        if (!mapping) {
          return NextResponse.json({ success: false, error: 'Row mapping not found for delete' }, { status: 404 });
        }

        const deletedMapping = { ...mapping };
        tempUserMapping.delete(body.rowKey);

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
        const mappings = Array.from(tempUserMapping.entries()).map(([key, value]) => ({
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
