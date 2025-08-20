import type { Table } from '@liblab/types';

/**
 * Format the database schema in a way that's easy for the LLM to understand
 */
export function formatDbSchemaForPrompt(schema: Table[]) {
  let result = '';

  for (const table of schema) {
    result += `Table: ${table.tableName}\n`;
    result += 'Columns:\n';

    for (const column of table.columns) {
      const primaryKeyIndicator = column.isPrimary ? ' (Primary Key)' : '';
      result += `  - ${column.name}: ${column.type}${primaryKeyIndicator}${column.enumValues ? ` Explicit values: ${column.enumValues}` : ''}\n`;
    }

    result += '\n';
  }

  return result;
}
