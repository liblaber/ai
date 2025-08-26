function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // Get spreadsheet ID from the request data
    const spreadsheetId = data.spreadsheetId;

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is required in the request data');
    }

    console.log('Using spreadsheet ID:', spreadsheetId);
    console.log('Received data:', JSON.stringify(data, null, 2));

    const sheet = SpreadsheetApp.openById(spreadsheetId).getActiveSheet();

    switch (data.action) {
      case 'appendRow': {
        // Handle both 1D array and 2D array formats
        let rowData;

        if (Array.isArray(data.values) && Array.isArray(data.values[0])) {
          // 2D array: [["val1", "val2", "val3"]]
          rowData = data.values[0];
        } else if (Array.isArray(data.values)) {
          // 1D array: ["val1", "val2", "val3"]
          rowData = data.values;
        } else {
          throw new Error('Invalid values format');
        }

        console.log('Appending row data to sheet:', spreadsheetId, rowData);
        sheet.appendRow(rowData);

        return ContentService.createTextOutput(
          JSON.stringify({
            success: true,
            message: `Successfully added row to spreadsheet ${spreadsheetId}`,
          }),
        );
      }

      case 'updateCell':
        console.log(`Updating cell at row ${data.row + 1}, column ${data.column + 1} in sheet ${spreadsheetId}`);
        sheet.getRange(data.row + 1, data.column + 1).setValue(data.value);
        return ContentService.createTextOutput(
          JSON.stringify({
            success: true,
            message: `Successfully updated cell in spreadsheet ${spreadsheetId}`,
          }),
        );

      case 'updateRange': {
        console.log(`Updating range ${data.range} in sheet ${spreadsheetId}`);

        const range = sheet.getRange(data.range);
        range.setValues(data.values);

        return ContentService.createTextOutput(
          JSON.stringify({
            success: true,
            message: `Successfully updated range in spreadsheet ${spreadsheetId}`,
          }),
        );
      }

      case 'deleteRow':
        console.log(`Deleting row ${data.rowIndex + 1} in sheet ${spreadsheetId}`);
        sheet.deleteRow(data.rowIndex + 1);
        return ContentService.createTextOutput(
          JSON.stringify({
            success: true,
            message: `Successfully deleted row in spreadsheet ${spreadsheetId}`,
          }),
        );

      case 'insertRow':
        console.log(`Inserting row before ${data.rowIndex + 1} in sheet ${spreadsheetId}`);
        sheet.insertRowBefore(data.rowIndex + 1);
        return ContentService.createTextOutput(
          JSON.stringify({
            success: true,
            message: `Successfully inserted row in spreadsheet ${spreadsheetId}`,
          }),
        );

      case 'clearValues': {
        console.log(`Clearing values in range ${data.range} in sheet ${spreadsheetId}`);

        const clearRange = sheet.getRange(data.range);
        clearRange.clearContent();

        return ContentService.createTextOutput(
          JSON.stringify({
            success: true,
            message: `Successfully cleared values in range ${data.range} in spreadsheet ${spreadsheetId}`,
            clearedRange: data.range,
          }),
        );
      }

      default:
        throw new Error('Unknown action: ' + data.action);
    }
  } catch (error) {
    console.error('Apps Script error:', error);
    return ContentService.createTextOutput(
      JSON.stringify({
        error: error.toString(),
        details: 'Check Google Apps Script logs for more information',
      }),
    );
  }
}

function doGet(e) {
  // Handle GET requests for testing
  const spreadsheetId = e.parameter.spreadsheetId || 'No spreadsheet ID provided';
  return ContentService.createTextOutput(`Google Sheets Proxy is working! Spreadsheet ID: ${spreadsheetId}`);
}

// Test function to verify the script works
function testScript(spreadsheetId) {
  if (!spreadsheetId) {
    throw new Error('Please provide a spreadsheet ID: testScript("your_spreadsheet_id_here")');
  }

  const testData = {
    action: 'appendRow',
    spreadsheetId,
    values: ['Test', 'Data', 'From', 'Script'],
  };

  const result = doPost({
    postData: {
      contents: JSON.stringify(testData),
    },
  });

  console.log('Test result:', result.getContent());
}
