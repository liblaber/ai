import { NextRequest, NextResponse } from 'next/server';
import { requireUserAbility } from '~/auth/session';
import { promises as fs } from 'fs';
import path from 'path';

// Helper to generate a unique key for a row based on its data
function generateRowKey(data: any): string {
  // Create a hash-like key from the data to identify unique rows
  const sortedKeys = Object.keys(data)
    .filter((k) => !['id', '_id'].includes(k))
    .sort();
  const values = sortedKeys.map((k) => String(data[k] || '').trim()).join('|');

  return Buffer.from(values).toString('base64').substring(0, 16);
}

// Temporary file-based persistence for row mappings
const MAPPINGS_DIR = path.join(process.cwd(), '.tmp', 'row-mappings');

// Ensure the mappings directory exists
async function ensureMappingsDir() {
  try {
    await fs.mkdir(MAPPINGS_DIR, { recursive: true });
  } catch {
    // Directory might already exist, ignore error
  }
}

// Load mappings from file
async function loadMappings(userId: string): Promise<Map<string, any>> {
  try {
    await ensureMappingsDir();

    const filePath = path.join(MAPPINGS_DIR, `${userId}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    const parsedData = JSON.parse(data);

    return new Map(Object.entries(parsedData));
  } catch {
    // File doesn't exist or error reading, return empty map
    return new Map();
  }
}

// Save mappings to file
async function saveMappings(userId: string, mappings: Map<string, any>): Promise<void> {
  try {
    await ensureMappingsDir();

    const filePath = path.join(MAPPINGS_DIR, `${userId}.json`);
    const data = Object.fromEntries(mappings);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Failed to save mappings:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication required and userId is used for persistent storage
    const { userId } = await requireUserAbility(request);
    const body = (await request.json()) as {
      action: 'register' | 'lookup' | 'update' | 'delete' | 'list';
      data?: any;
      rowIndex?: number;
      spreadsheetId?: string;
      rowKey?: string;
    };

    // Load persistent mappings for this user
    const userMapping = await loadMappings(userId);

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

        // Save the updated mappings
        await saveMappings(userId, userMapping);

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

        // Save the updated mappings
        await saveMappings(userId, userMapping);

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

        // Save the updated mappings
        await saveMappings(userId, userMapping);

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
