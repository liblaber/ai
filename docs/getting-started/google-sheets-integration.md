# Google Sheets Integration Guide

This guide provides comprehensive instructions for integrating Google Sheets as a data source. We support three authentication methods to accommodate different use cases, from quick testing to production deployments with full OAuth integration.

## Table of Contents

- [Quick Start](#quick-start)
- [Authentication Methods](#authentication-methods)
- [Setup Instructions](#setup-instructions)
- [Configuration Examples](#configuration-examples)
- [Operations Reference](#operations-reference)
- [Performance Considerations](#performance-considerations)
- [Troubleshooting](#troubleshooting)
- [Security Notes](#security-notes)

## Quick Start

Choose your authentication method based on your needs:

| Method                                                        | Use Case                   | Setup Time | Capabilities    |
| ------------------------------------------------------------- | -------------------------- | ---------- | --------------- |
| **[Sharable Link](#method-1-sharable-link-read-only)**        | Testing, public data       | 30 seconds | Read-only       |
| **[Apps Script](#method-2-apps-script-recommended)**          | Production, private sheets | 5 minutes  | Full read/write |
| **[OAuth Integration](#method-3-oauth-integration-advanced)** | Enterprise, multi-user     | 15 minutes | Full API access |

## Authentication Methods

### Method 1: Sharable Link (Read-Only)

**Best for**: Quick testing, public dashboards, read-only data sources

**Pros**:

- Instant setup (30 seconds)
- No technical configuration required
- Works with any publicly accessible sheet

**Cons**:

- Read-only access only
- Requires manual permission changes
- Not suitable for private/sensitive data

**Performance**: Fastest for read operations, direct CSV access

### Method 2: Apps Script (Recommended)

**Best for**: Most production use cases, private sheets, full functionality

**Pros**:

- Full read/write capabilities
- Works with public sheets
- No Google Cloud Console setup required
- No API rate limits beyond Google's generous Apps Script quotas
- 5-minute setup process

**Cons**:

- Requires creating a Google Apps Script
- One-time deployment step needed

**Performance**: Excellent performance, efficient batch operations

### Method 3: OAuth Integration (Advanced)

**Best for**: Enterprise deployments, multi-user scenarios, private sheets, maximum API access

**Pros**:

- Full Google Sheets API access
- Works with private sheets
- Multi-user authentication
- Token refresh and management
- Enterprise-grade security

**Cons**:

- Requires Google Cloud Console setup
- More complex configuration
- Subject to Google API rate limits
- Requires environment variable configuration

**Performance**: Good performance, subject to Google API quotas

---

## Setup Instructions

### Method 1: Sharable Link Setup

#### Step 1: Make Your Sheet Accessible

1. Open your Google Sheet
2. Click **Share** in the top-right corner
3. Change access to **"Anyone with the link can view"**
4. Copy the sharing link

#### Step 2: Extract Sheet ID

Copy your sheet URL until the edit portion: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`

#### Step 3: Test Your Connection

You can test with these example sheets:

- **Sample Expenses**: `https://docs.google.com/spreadsheets/d/1womSaXyKIcUQli3qWWwc_6LQ83Z5Lez4YZBmg9u7WjA/edit`
- **Sample Customers**: `https://docs.google.com/spreadsheets/d/1X5wHBsWadXzD8SbgDwKehDf2IlNKuXSd3d_1OMkccV4/edit`

### Method 2: Apps Script Setup (Recommended)

#### Step 1: Create Google Apps Script

1. Go to [script.google.com](https://script.google.com)
2. Click **"New Project"**
3. Replace the default code with the provided script (see below)
4. Save the project with a meaningful name (e.g., "Sheet Integration Proxy")

#### Step 2: Apps Script Code

Replace the default code with this script:

```javascript
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
```

#### Step 3: Deploy Web App

1. Click **"Deploy"** → **"New deployment"**
2. Choose type: **"Web app"**
3. Configure settings:
   - **Execute as**: "Me" (your-email@gmail.com)
   - **Who has access**: "Anyone"

   _Note: This is secure - the script can only access sheets you own_

4. Click **"Deploy"**
5. **Important**: Copy the Web App URL (format: `https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec`)

#### Step 4: Create Connection String

Paste the URL in the Apps Script Web App input.

### Method 3: OAuth Integration Setup (Advanced)

#### Step 1: Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable the Google Sheets API:
   - Go to **"APIs & Services"** → **"Library"**
   - Search for **"Google Sheets API"**
   - Click **"Enable"**
   - Search for **Google Drive API**
   - Click **"Enable"**

#### Step 2: Create OAuth Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth 2.0 Client IDs"**
3. Choose application type: **"Web application"**
4. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/google-workspace/callback` (development)
   - `https://yourdomain.com/api/auth/google-workspace/callback` (production)
5. Save and copy:
   - **Client ID**
   - **Client Secret**

#### Step 3: Environment Variables

Create or update your `.env` file:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_AUTH_ENCRYPTION_KEY=your_32_character_encryption_key_here
GOOGLE_REDIRECT_URI=http://yourdomain.com/api/auth/google-workspace/callback
```

**Generate encryption key**:

```bash
# Generate a secure 32-character key
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

#### Step 4: OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Choose **"External"** (for most use cases)
3. Fill required information:
   - **App name**: Your application name
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/drive.readonly`
5. Save and continue

#### Step 5: Using OAuth Authentication

With OAuth configured, users can:

1. Click **"Sign in with Google"** in the data source setup
2. Grant permissions to access their sheets
3. Select spreadsheets directly from their Google Drive
4. Connection string is automatically generated

---

## Configuration Examples

### JSON Query Format

All operations use JSON format. Here are common examples:

#### Read Operations

```json
// Read entire sheet
{
  "operation": "readSheet",
  "parameters": {
    "sheetName": "Sheet1"
  }
}

// Read specific range
{
  "operation": "readRange",
  "parameters": {
    "range": "A1:E10"
  }
}

// Get multiple ranges
{
  "operation": "getValues",
  "parameters": {
    "ranges": ["A1:B10", "D1:E10"]
  }
}
```

#### Write Operations

```json
// Append new row
{
  "operation": "appendRow",
  "parameters": {
    "values": ["2024-01-15", "Coffee", "Food", 5.50, "Morning coffee"]
  }
}

// Update specific cell
{
  "operation": "updateCell",
  "parameters": {
    "row": 2,
    "column": 4,
    "value": 6.00
  }
}

// Update range
{
  "operation": "updateRange",
  "parameters": {
    "range": "A2:E2",
    "values": [["2024-01-15", "Lunch", "Food", 12.50, "Business lunch"]]
  }
}

// Insert row
{
  "operation": "insertRow",
  "parameters": {
    "insertIndex": 2,
    "sheetId": 0
  }
}

// Delete row
{
  "operation": "deleteRow",
  "parameters": {
    "deleteIndex": 4,
    "sheetId": 0
  }
}
```

### Supported Operations

| Operation      | Method             | Capability             | Parameters               |
| -------------- | ------------------ | ---------------------- | ------------------------ |
| `readSheet`    | All                | Read entire sheet      | `sheetName`              |
| `readRange`    | All                | Read specific range    | `range`                  |
| `getAllSheets` | All                | List all sheet names   | None                     |
| `getValues`    | All                | Read multiple ranges   | `ranges[]`               |
| `appendRow`    | Apps Script, OAuth | Add row to end         | `values[]`               |
| `updateRange`  | Apps Script, OAuth | Update cell range      | `range`, `values[][]`    |
| `updateCell`   | Apps Script, OAuth | Update single cell     | `row`, `column`, `value` |
| `insertRow`    | Apps Script, OAuth | Insert row at position | `insertIndex`, `sheetId` |
| `deleteRow`    | Apps Script, OAuth | Delete row by index    | `deleteIndex`, `sheetId` |
| `clearValues`  | Apps Script, OAuth | Clear range content    | `range`                  |

---

## Operations Reference

### Complete Examples

#### Expense Tracker Operations

```json
// Add new expense
{
  "operation": "appendRow",
  "parameters": {
    "values": [
      "2024-01-15",
      "Restaurant",
      "Food & Dining",
      25.99,
      "Team dinner"
    ]
  }
}

// Update expense category
{
  "operation": "updateRange",
  "parameters": {
    "range": "C5",
    "values": [["Entertainment"]]
  }
}

// Delete expense (row 8)
{
  "operation": "deleteRow",
  "parameters": {
    "deleteIndex": 7,
    "sheetId": 0
  }
}
```

#### Inventory Management

```json
// Add new product
{
  "operation": "appendRow",
  "parameters": {
    "values": ["SKU001", "Laptop", "Electronics", 50, 999.99, "In Stock"]
  }
}

// Update stock quantity
{
  "operation": "updateRange",
  "parameters": {
    "range": "D3",
    "values": [[45]]
  }
}

// Mark product as out of stock
{
  "operation": "updateRange",
  "parameters": {
    "range": "F3",
    "values": [["Out of Stock"]]
  }
}
```

#### Customer Data Management

```json
// Add new customer
{
  "operation": "appendRow",
  "parameters": {
    "values": [
      "John Doe",
      "john.doe@email.com",
      "+1-555-0123",
      "123 Main St",
      "Premium"
    ]
  }
}

// Update customer tier
{
  "operation": "updateRange",
  "parameters": {
    "range": "E2",
    "values": [["VIP"]]
  }
}
```

---

## Performance Considerations

### Optimization Best Practices

1. **Batch Operations**: Use `updateRange` instead of multiple `updateCell` calls

   ```json
   // ✅ Good: Single batch update
   {
     "operation": "updateRange",
     "parameters": {
       "range": "A1:C1",
       "values": [["Value1", "Value2", "Value3"]]
     }
   }

   // ❌ Avoid: Multiple individual updates
   // Multiple updateCell operations
   ```

2. **Specific Ranges**: Request only needed data ranges

   ```json
   // ✅ Good: Specific range
   { "operation": "readRange", "parameters": { "range": "A1:E10" }}

   // ❌ Avoid: Entire sheet when unnecessary
   { "operation": "readSheet", "parameters": { "sheetName": "Sheet1" }}
   ```

3. **Cache Read Data**: Store frequently accessed data locally

4. **Use Appropriate Value Options**:
   - `USER_ENTERED`: Handles formatting automatically
   - `RAW`: For raw data without formatting

### Performance Comparison

| Method        | Read Speed | Write Speed | Rate Limits  | Best For             |
| ------------- | ---------- | ----------- | ------------ | -------------------- |
| Sharable Link | ⚡ Fastest | N/A         | None         | Read-heavy workloads |
| Apps Script   | 🔥 Fast    | 🔥 Fast     | Very high    | Balanced read/write  |
| OAuth         | ✅ Good    | ✅ Good     | Standard API | Enterprise scenarios |

### Rate Limits and Quotas

- **Sharable Link**: No limits (direct CSV access)
- **Apps Script**:
  - 6 minutes execution time per operation
  - 20,000 trigger executions per day
  - Very generous for typical use cases
- **OAuth**: Standard Google API quotas
  - 300 requests per minute per project
  - 100 requests per 100 seconds per user

---

## Troubleshooting

### Common Issues and Solutions

#### "Permission denied" Errors

**For Sharable Link**:

- Verify sheet is set to "Anyone with the link can view"
- Check if the sharing link is correct
- Ensure the sheet hasn't been moved or deleted

**For Apps Script**:

- Run the script manually once to grant permissions
- Ensure the script owner has access to the target spreadsheet
- Check Apps Script execution transcript for detailed errors

**For OAuth**:

- Verify OAuth consent screen is configured
- Check if required scopes are included
- Ensure redirect URIs match exactly

#### "Invalid spreadsheet ID" Errors

```bash
# ✅ Correct format
sheets://1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/

# ❌ Common mistakes
sheets://https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5n.../  # Full URL instead of ID
sheets://1BxiMVs0XRA5n  # Incomplete ID
```

#### "Range not found" Errors

- Use A1 notation: `A1`, `A1:B10`, `Sheet1!A1:B10`
- Verify sheet names match exactly (case-sensitive)
- Check if the range exists in the target sheet

#### Apps Script Issues

**"Script function not found"**:

- Function must be named `doPost` (case-sensitive)
- Redeploy the script after making changes

**"Execution exceeded maximum time"**:

- Operation is too large for single execution
- Break into smaller batch operations
- Use `updateRange` instead of multiple `updateCell` calls

#### OAuth Configuration Issues

**"Redirect URI mismatch"**:

- Ensure redirect URIs in Google Cloud Console match your domain exactly
- Include both HTTP (development) and HTTPS (production) versions

**Missing Environment Variables**:

```bash
# Check all required variables are set
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_AUTH_ENCRYPTION_KEY=your_32_char_key
```

### Debugging Tips

1. **Test Apps Script directly**:
   - Visit your Web App URL in browser
   - Should return: `"Google Sheets Proxy is working!"`

2. **Check Apps Script Logs**:
   - Go to script.google.com → Your project → Execution transcript
   - Review console.log outputs and errors

3. **Verify Sheet Access**:
   - Ensure you can manually open the sheet
   - Check sharing permissions
   - Verify spreadsheet ID extraction

4. **Test with Simple Operations**:
   - Start with `readSheet` operation
   - Then try `appendRow` with simple data
   - Gradually test more complex operations

---

## Security Notes

### Data Protection

- **Sharable Link**: Data is accessible to anyone with the link
- **Apps Script**: Data access limited to script owner's permissions
- **OAuth**: Data access follows Google's OAuth security model

### Best Practices

1. **Environment Variables**: Never commit OAuth credentials to version control
2. **Encryption Key**: Use a strong, randomly generated encryption key
3. **Access Scopes**: Request minimal necessary Google API scopes
4. **Regular Rotation**: Rotate OAuth credentials periodically
5. **Monitoring**: Monitor for unusual access patterns

### Production Deployment

1. **HTTPS Only**: Use HTTPS in production for OAuth redirect URIs
2. **Environment Isolation**: Separate development and production OAuth applications
3. **Error Logging**: Implement proper error logging and monitoring
4. **Rate Limiting**: Implement application-level rate limiting for API calls

### Compliance Considerations

- **Data Residency**: Data remains in user's Google account
- **Audit Trail**: Google provides access logs for sheets
- **GDPR/Privacy**: OAuth requires explicit user consent
- **Data Processing**: App Script operations logged in user's Google account

---

## Integration Examples

### Error Handling

```javascript
try {
  const result = await executeQuery(connectionString, JSON.stringify(query));

  if (result[0]?.success) {
    console.log('Operation successful:', result[0]);
  } else {
    console.error('Operation failed:', result[0]?.error);
  }
} catch (error) {
  console.error('Query execution failed:', error.message);
}
```

This comprehensive guide covers all aspects of Google Sheets integration. Choose the method that best fits your needs, and refer to the troubleshooting section if you encounter issues.

For additional support, ensure you have:

- ✅ Correct connection string format
- ✅ Proper sheet permissions
- ✅ Valid JSON query structure
- ✅ All required environment variables (for OAuth)

Happy integrating! 🚀
