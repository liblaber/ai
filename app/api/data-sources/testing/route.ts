import { NextRequest, NextResponse } from 'next/server';
import { DataSourcePluginManager } from '~/lib/plugins/data-access/data-access-plugin-manager';
import { z } from 'zod';

const testConnectionSchema = z.object({
  connectionString: z.string().min(1, 'Connection string is required'),
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const connectionString = formData.get('connectionString');

    const validationResult = testConnectionSchema.safeParse({ connectionString });

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.errors[0]?.message || 'Invalid request data' },
        { status: 400 },
      );
    }

    const { connectionString: databaseUrl } = validationResult.data;

    try {
      // Get the appropriate accessor for the database URL
      const accessor = await DataSourcePluginManager.getAccessor(databaseUrl);

      // Validate the connection string format
      accessor.validate(databaseUrl);

      const isConnected = await accessor.testConnection(databaseUrl);

      if (isConnected) {
        return NextResponse.json({ success: true, message: 'Connection successful' });
      } else {
        return NextResponse.json(
          {
            success: false,
            message: 'Failed to connect to database',
          },
          { status: 400 },
        );
      }
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to connect to database',
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error('Error testing connection:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
