import { NextRequest, NextResponse } from 'next/server';
import { requireUserAbility } from '~/auth/session';
import { z } from 'zod';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('sheets-rows');

const sheetsRowsRequestSchema = z.object({
  action: z.enum(['register', 'lookup', 'update', 'delete', 'list']),
  data: z.unknown().optional(),
  rowIndex: z.number().int().positive().optional(),
  spreadsheetId: z.string().min(1).optional(),
  rowKey: z.string().min(1).optional(),
});

function generateRowKey(data: any): string {
  const sortedKeys = Object.keys(data)
    .filter((k) => !['id', '_id'].includes(k))
    .sort();
  const values = sortedKeys.map((k) => String(data[k] || '').trim()).join('|');

  return Buffer.from(values).toString('base64').substring(0, 16);
}

const userMappings = new Map<string, Map<string, any>>();

function loadMappings(userId: string): Map<string, any> {
  if (!userMappings.has(userId)) {
    userMappings.set(userId, new Map());
  }

  return userMappings.get(userId)!;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireUserAbility(request);
    const rawBody = await request.json();
    const body = sheetsRowsRequestSchema.parse(rawBody);
    const userMapping = loadMappings(userId);

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
    logger.error('[RowMapping] Error:', error);

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
      { success: false, error: error instanceof Error ? error.message : 'Row mapping operation failed' },
      { status: 500 },
    );
  }
}
