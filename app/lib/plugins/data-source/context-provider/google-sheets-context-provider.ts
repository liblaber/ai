import { z } from 'zod';
import type {
  AdditionalContextInput,
  AdditionalContextOutput,
  DataSourceContextProvider,
} from '~/lib/plugins/data-source/context-provider/data-source-context-provider';
import { generateObject } from 'ai';
import { getLlm } from '~/lib/.server/llm/get-llm';
import { logger } from '~/utils/logger';

// Removed unused parameter schema

const googleSheetsOperationSchema = z.object({
  operation: z
    .enum([
      'readSheet',
      'readSheetPaginated',
      'readRange',
      'getAllSheets',
      'getValues',
      'updateRange',
      'updateValues',
      'updateCell',
      'appendValues',
      'appendRow',
      'clearValues',
      'clearRange',
    ])
    .describe('Google Sheets operation to perform'),
  parameters: z
    .object({
      sheetName: z.string().optional().describe('Name of the specific sheet (optional)'),
      range: z.string().optional().describe('A1 notation range (e.g., A1:B10)'),
      valueRenderOption: z
        .enum(['FORMATTED_VALUE', 'UNFORMATTED_VALUE', 'FORMULA'])
        .default('FORMATTED_VALUE')
        .describe('How values should be rendered'),
      startRow: z.number().optional().describe('Starting row number for paginated reads'),
      maxRows: z.number().optional().describe('Maximum number of rows to return'),
      values: z.array(z.array(z.any())).optional().describe('Values to write (for write operations)'),
    })
    .describe('Parameters for the Google Sheets operation'),
  description: z.string().min(10).describe('Brief description of what the operation does'),
});

const googleSheetsOperationsSchema = z.object({
  operations: z.array(googleSheetsOperationSchema).min(1).describe('Array of Google Sheets operations needed'),
});

type GoogleSheetsOperations = z.infer<typeof googleSheetsOperationsSchema>;

export class GoogleSheetsContextProvider implements DataSourceContextProvider {
  async getContext(input: AdditionalContextInput): Promise<AdditionalContextOutput> {
    try {
      const systemPrompt = this._getSystemPrompt(input);
      const llm = await getLlm();

      const result = await generateObject({
        schema: googleSheetsOperationsSchema,
        model: llm.instance,
        maxTokens: llm.maxOutputTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: input.userPrompt }],
      });

      logger.debug(`Generated Google Sheets operations: \n\n${JSON.stringify(result.object, null, 2)}`);

      if (!result || !result.object || !Array.isArray(result.object.operations)) {
        logger.error(`Invalid response format from LLM: ${JSON.stringify(result)}`);
        return {
          additionalContext: null,
          llmUsage: result?.usage,
        };
      }

      return { additionalContext: this._mapOperationsToPrompt(result.object), llmUsage: result?.usage };
    } catch (error) {
      logger.error('Error generating Google Sheets context:', error);
      return {
        additionalContext: null,
      };
    }
  }

  private _getSystemPrompt({ userPrompt, conversationSummary, implementationPlan }: AdditionalContextInput): string {
    return `
You are a Google Sheets expert that analyzes requirements and maps them to specific Google Sheets operations.
Given user requirements, conversation context, and implementation plan, determine the exact
Google Sheets JSON operations needed.

<userPrompt>
${userPrompt}
</userPrompt>

${conversationSummary ? `<conversationSummary>${conversationSummary}</conversationSummary>` : ''}
${implementationPlan ? `Use the following implementation plan for context, to inform your operation selection: <implementationPlan>${implementationPlan}</implementationPlan>` : ''}

Your task is to analyze the inputs and return a structured response with required Google Sheets operations.

Google Sheets operates with JSON-based operations, not SQL. Each operation targets specific sheets and ranges.

Key Google Sheets Operations:
- readSheetPaginated: Read data with pagination (recommended for large datasets)
- readSheet: Read all data from a sheet
- readRange: Read specific range in A1 notation
- getAllSheets: Get information about all sheets
- updateRange/updateValues: Update cell ranges
- appendRow/appendValues: Add new rows
- clearValues: Clear cell contents

1. Analyze the user requirements carefully
2. Identify which sheets and data ranges are needed
3. Determine if read, write, or mixed operations are required
4. Map to specific Google Sheets operations with exact parameters
5. Return only operations that are necessary to fulfill the requirements
6. Provide clear and concise description of what each operation does
7. Use appropriate valueRenderOption (FORMATTED_VALUE, UNFORMATTED_VALUE, FORMULA)
`;
  }

  private _mapOperationsToPrompt(operations: GoogleSheetsOperations): string {
    return `<googleSheetsOperations>
  ${operations.operations
    .map((op) => {
      const paramsStr = Object.entries(op.parameters)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');

      return `  <operation type="${op.operation}" ${paramsStr}>
    <desc>${op.description}</desc>
  </operation>`;
    })
    .join('\n  \n')}
</googleSheetsOperations>

IMPORTANT: Always use JSON format for Google Sheets operations, never SQL.
Example: {"operation": "readSheetPaginated", "parameters": {"maxRows": 50, "valueRenderOption": "FORMATTED_VALUE"}}`;
  }
}
