import z from 'zod';

export const databaseQuerySchema = z.object({
  query: z.string(),
  explanation: z.string(),
  responseSchema: z.string(),
});

export const databaseQueriesSchema = z.object({
  queries: z.array(databaseQuerySchema),
});

/**
 * Represents a SQL query with its explanation and expected response schema.
 * Used for executing and documenting SQL operations.
 *
 * query: The SQL query to be executed
 * explanation: Brief explanation of what this query does
 * responseSchema: The response schema with column names and types
 */
export type DatabaseQuery = z.infer<typeof databaseQuerySchema>;

export type DatabaseQueryOutput = DatabaseQuery[];

export interface Column {
  name: string;
  type: string;
  isPrimary: boolean;
  enumValues?: string[];
}

export interface Table {
  tableName: string;
  columns: Column[];
  metadata?: {
    actualSheetName?: string;
  };
}

export type GenerateSqlQueriesOptions = {
  schema: Table[];
  userPrompt: string;
  connectionString: string;
  implementationPlan?: string;
  existingQueries?: string[];
};
