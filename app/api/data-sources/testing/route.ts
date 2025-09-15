import { NextRequest, NextResponse } from 'next/server';
import { DataSourcePluginManager } from '~/lib/plugins/data-source/data-access-plugin-manager';
import type { DataSourceProperty, DataSourceType } from '@liblab/data-access/utils/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const type = formData.get('type') as DataSourceType;

    // array of datasource properties
    const propertiesJson = formData.get('properties') as string;
    const properties = JSON.parse(propertiesJson) as DataSourceProperty[];

    if (!properties?.length) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    try {
      // Get the appropriate accessor for the database URL
      const accessor = await DataSourcePluginManager.getAccessor(type);

      // Validate the connection string format
      accessor.validateProperties(properties);

      const isConnected = await accessor.testConnection(properties);

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
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
