import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DataSourcePluginManager } from '~/lib/plugins/data-access/data-access-plugin-manager';
import { requireUserId } from '~/auth/session';
import { prisma } from '~/lib/prisma';

const requestSchema = z.object({
  query: z.string(),
  dataSourceId: z.string(),
});

export async function POST(request: NextRequest) {
  const userId = await requireUserId(request);

  try {
    const body = await request.json();
    const { query, dataSourceId } = requestSchema.parse(body);

    // Get the data source to determine the database type
    const dataSource = await prisma.dataSource.findUniqueOrThrow({
      where: { id: dataSourceId, createdById: userId },
    });

    const accessor = await DataSourcePluginManager.getAccessor(dataSource.connectionString);

    const formattedQuery = accessor.formatQuery(query);

    return NextResponse.json({ formattedQuery });
  } catch (error) {
    console.error('Error formatting query:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to format query' },
      { status: 500 },
    );
  }
}
