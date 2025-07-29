import { NextRequest, NextResponse } from 'next/server';
import { DataSourcePluginManager } from '~/lib/plugins/data-access/data-access-plugin-manager';
import PluginManager from '~/lib/plugins/plugin-manager';

export async function GET() {
  return NextResponse.json({ message: 'Connection testing endpoint is available' });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const databaseUrl = formData.get('connectionString') as string;

    if (!databaseUrl) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    try {
      // Initialize the plugin manager if not already initialized
      await PluginManager.getInstance().initialize();

      // Get the appropriate accessor for the database URL
      const accessor = DataSourcePluginManager.getAccessor(databaseUrl);

      // Validate the connection string format
      accessor.validate(databaseUrl);

      // Test the actual connection
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
