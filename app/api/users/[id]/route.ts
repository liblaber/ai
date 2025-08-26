import { NextRequest, NextResponse } from 'next/server';
import { requireUserId, requireUserAbility } from '~/auth/session';

// Generic Google Sheets Update Handler - Works with any sheet structure using row mapping
async function handleGoogleSheetsUpdate(request: NextRequest, recordData: any): Promise<NextResponse> {
  try {
    // Step 1: Look up the row mapping for this record
    const rowMappingResponse = await fetch(new URL('/api/sheets-rows', request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('Authorization') || '',
        Cookie: request.headers.get('Cookie') || '',
      },
      body: JSON.stringify({
        action: 'lookup',
        data: recordData,
      }),
    });

    if (!rowMappingResponse.ok) {
      const errorText = await rowMappingResponse.text();
      throw new Error(`Row mapping lookup failed: ${rowMappingResponse.status} - ${errorText}`);
    }

    const mappingResult = (await rowMappingResponse.json()) as any;

    if (!mappingResult.success) {
      throw new Error(`Row mapping not found: ${mappingResult.error}`);
    }

    const { rowIndex, spreadsheetId } = mappingResult.mapping;

    // Step 2: Get the data source connection string
    const dataSources = await getAvailableDataSources(request);
    const googleSheetsSource = dataSources.find((ds) => ds.connectionString?.includes(spreadsheetId));

    if (!googleSheetsSource) {
      throw new Error(`No Google Sheets data source found for spreadsheet ${spreadsheetId}`);
    }

    // Step 3: Build the targeted update operation using the specific row
    const updateOperation = buildTargetedUpdateOperation(recordData, rowIndex);

    // Step 4: Execute the update via the execute-query endpoint
    const queryResponse = await fetch(new URL('/api/execute-query', request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('Authorization') || '',
        Cookie: request.headers.get('Cookie') || '',
      },
      body: JSON.stringify({
        databaseUrl: googleSheetsSource.connectionString,
        query: JSON.stringify(updateOperation),
      }),
    });

    if (!queryResponse.ok) {
      const errorText = await queryResponse.text();
      throw new Error(`Google Sheets update failed: ${queryResponse.status} - ${errorText}`);
    }

    const result = await queryResponse.json();

    // Step 5: Update the row mapping with new data
    await fetch(new URL('/api/sheets-rows', request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('Authorization') || '',
        Cookie: request.headers.get('Cookie') || '',
      },
      body: JSON.stringify({
        action: 'update',
        rowKey: mappingResult.mapping.rowKey,
        data: recordData,
      }),
    });

    return NextResponse.json({
      success: true,
      message: 'Record updated successfully',
      result,
    });
  } catch (error) {
    console.error('Google Sheets update failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update record',
      },
      { status: 500 },
    );
  }
}

// Generic Google Sheets Delete Handler - Works with any sheet structure using row mapping
async function handleGoogleSheetsDelete(request: NextRequest, recordData: any, _recordId: any): Promise<NextResponse> {
  try {
    // Step 1: Look up the row mapping for this record
    const rowMappingResponse = await fetch(new URL('/api/sheets-rows', request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('Authorization') || '',
        Cookie: request.headers.get('Cookie') || '',
      },
      body: JSON.stringify({
        action: 'lookup',
        data: recordData,
      }),
    });

    if (!rowMappingResponse.ok) {
      const errorText = await rowMappingResponse.text();
      throw new Error(`Row mapping lookup failed: ${rowMappingResponse.status} - ${errorText}`);
    }

    const mappingResult = (await rowMappingResponse.json()) as any;

    if (!mappingResult.success) {
      throw new Error(`Row mapping not found: ${mappingResult.error}`);
    }

    const { rowIndex, spreadsheetId, rowKey } = mappingResult.mapping;

    // Step 2: Get the data source connection string
    const dataSources = await getAvailableDataSources(request);
    const googleSheetsSource = dataSources.find((ds) => ds.connectionString?.includes(spreadsheetId));

    if (!googleSheetsSource) {
      throw new Error(`No Google Sheets data source found for spreadsheet ${spreadsheetId}`);
    }

    // Step 3: Build the targeted delete operation using the specific row
    const deleteOperation = buildTargetedDeleteOperation(rowIndex);

    // Step 4: Execute the delete via the execute-query endpoint
    const queryResponse = await fetch(new URL('/api/execute-query', request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('Authorization') || '',
        Cookie: request.headers.get('Cookie') || '',
      },
      body: JSON.stringify({
        databaseUrl: googleSheetsSource.connectionString,
        query: JSON.stringify(deleteOperation),
      }),
    });

    if (!queryResponse.ok) {
      const errorText = await queryResponse.text();
      throw new Error(`Google Sheets delete failed: ${queryResponse.status} - ${errorText}`);
    }

    const result = await queryResponse.json();

    // Step 5: Remove the row mapping since the row is deleted
    await fetch(new URL('/api/sheets-rows', request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('Authorization') || '',
        Cookie: request.headers.get('Cookie') || '',
      },
      body: JSON.stringify({
        action: 'delete',
        rowKey,
      }),
    });

    return NextResponse.json({
      success: true,
      message: 'Record deleted successfully',
      result,
    });
  } catch (error) {
    console.error('Google Sheets delete failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete record',
      },
      { status: 500 },
    );
  }
}

// Targeted update operation builder - updates specific row based on mapping
function buildTargetedUpdateOperation(recordData: any, rowIndex: number): any {
  // PRODUCTION WARNING: This implementation assumes field order matches sheet columns
  // For production use, implement proper column mapping using sheet schema
  // TODO: Use schema information to map recordData fields to correct sheet columns

  // Extract all the fields from the record data (excluding metadata)
  const fields = Object.keys(recordData).filter(
    (key) => !['id', '_id', 'createdAt', 'updatedAt'].includes(key), // Skip metadata fields
  );

  // Build values array from the record data
  // WARNING: This assumes fields are in the same order as sheet columns
  const values = fields.map((field) => recordData[field] || '');

  // Determine the range based on available data and specific row
  const endColumn = String.fromCharCode(65 + fields.length - 1); // A, B, C, ... based on field count
  const targetRow = rowIndex + 1; // Convert 0-based index to 1-based row number
  const range = `A${targetRow}:${endColumn}${targetRow}`; // Update the specific row

  return {
    operation: 'updateValues',
    parameters: {
      range,
      values: [values],
      valueInputOption: 'USER_ENTERED',
    },
  };
}

// Targeted delete operation builder - deletes specific row based on mapping
function buildTargetedDeleteOperation(rowIndex: number): any {
  return {
    operation: 'deleteRow',
    parameters: {
      sheetId: 0, // First sheet
      deleteIndex: rowIndex, // Use the specific row index from mapping
    },
  };
}

// Helper to get available data sources
async function getAvailableDataSources(request: NextRequest): Promise<any[]> {
  try {
    // Get user ability to fetch data sources with proper permissions
    const { userAbility } = await requireUserAbility(request);

    // Import the getDataSources function
    const { getDataSources } = await import('~/lib/services/datasourceService');

    // Fetch actual data sources from the database
    const dataSources = await getDataSources(userAbility);

    return dataSources;
  } catch (error) {
    console.error('Failed to fetch data sources:', error);
    return [];
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUserId(request);

    const { id } = await params;
    const body = await request.json();

    // Check if this is a Google Sheets operation (ID is undefined/null and we have record data)
    if ((!id || id === 'undefined' || id === 'null') && body && typeof body === 'object') {
      return await handleGoogleSheetsUpdate(request, body);
    }

    if (!id || id === 'undefined') {
      return NextResponse.json(
        {
          success: false,
          error:
            'Row mapping not found. Ensure Google Sheets data has been properly loaded and mapped before attempting updates.',
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'User not found',
      },
      { status: 404 },
    );
  } catch (error) {
    console.error('Users API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user',
        debugInfo: 'Check server logs for detailed error information',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUserId(request);

    const { id } = await params;
    const body = await request.json().catch(() => ({})); // DELETE might not have body

    // Check if this is a Google Sheets operation (ID is undefined/null)
    if (!id || id === 'undefined' || id === 'null') {
      return await handleGoogleSheetsDelete(request, body, id);
    }

    // Handle regular user deletion (if this was a real user endpoint)
    return NextResponse.json(
      {
        success: false,
        error: `User deletion not implemented. ID: ${id}`,
      },
      { status: 501 },
    );
  } catch (error) {
    console.error('Users DELETE API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete user',
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not implemented',
    },
    { status: 501 },
  );
}
