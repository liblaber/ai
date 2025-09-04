import { logger } from '~/utils/logger';
import { generateObject } from 'ai';
import { z } from 'zod';
import { DataAccessor } from '@liblab/data-access/dataAccessor';
import { getLlm } from './get-llm';
import { getConnectionProtocol } from '@liblab/data-access/utils/connection';

const queryDecisionSchema = z.object({
  shouldUpdateSql: z.boolean(),
  explanation: z.string(),
});

// Create dynamic database type detection schema based on available database types
const getDatabaseTypeDetectionSchema = () => {
  const availableTypes = DataAccessor.getAvailableDatabaseTypes();

  // Ensure we have at least one type for the enum, and cast to the correct tuple type
  const typesArray = availableTypes.length > 0 ? availableTypes : ['postgres'];

  return z.object({
    detectedType: z.enum(typesArray as [string, ...string[]]),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
  });
};

const sqlQuerySchema = z.object({
  query: z.string(),
  explanation: z.string(),
  responseSchema: z.string(),
});

const sqlQueriesSchema = z.object({
  queries: z.array(sqlQuerySchema),
});

/**
 * Represents a SQL query with its explanation and expected response schema.
 * Used for executing and documenting SQL operations.
 *
 * query: The SQL query to be executed
 * explanation: Brief explanation of what this query does
 * responseSchema: The response schema with column names and types
 */
export type SqlQuery = z.infer<typeof sqlQuerySchema>;

export type SqlQueryOutput = SqlQuery[];

export interface Column {
  name: string;
  type: string;
  isPrimary: boolean;
  enumValues?: string[];
}

export interface Table {
  tableName: string;
  columns: Column[];
}

export type GenerateSqlQueriesOptions = {
  schema: Table[];
  userPrompt: string;
  connectionString: string;
  implementationPlan?: string;
  existingQueries?: string[];
};

export async function generateSqlQueries({
  schema,
  userPrompt,
  connectionString,
  existingQueries,
}: GenerateSqlQueriesOptions): Promise<SqlQueryOutput | undefined> {
  const dbSchema = formatDbSchemaForLLM(schema);

  // Get the appropriate accessor for this database type
  const accessor = DataAccessor.getAccessor(connectionString);

  if (!accessor) {
    const protocol = getConnectionProtocol(connectionString);
    throw new Error(`No accessor found for database type: ${protocol}`);
  }

  const systemPrompt = accessor.generateSystemPrompt(accessor.label, dbSchema, existingQueries, userPrompt);

  try {
    const llm = await getLlm();

    logger.info(`Generating SQL for prompt: ${userPrompt}, using model: ${llm.instance.modelId}`);

    const result = await generateObject({
      schema: sqlQueriesSchema,
      model: llm.instance,
      maxTokens: llm.maxOutputTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    try {
      const parsedQueries = result?.object?.queries;

      if (!Array.isArray(parsedQueries)) {
        throw new Error('Invalid response format: expected non-empty array');
      }

      if (parsedQueries.length === 0) {
        logger.info('No queries generated!');
        return undefined;
      }

      const queries: SqlQueryOutput = [];

      for (const query of parsedQueries) {
        try {
          const validatedQuery = sqlQuerySchema.parse(query);
          queries.push(validatedQuery);
        } catch (validationError) {
          logger.warn(
            `Skipping invalid SQL query object: ${JSON.stringify(query)}\nValidation error: ${validationError}`,
          );
        }
      }

      if (queries.length === 0) {
        logger.info('No queries were successfully validated');
        return undefined;
      }

      logger.info(`Generated SQL queries: \n\n${JSON.stringify(queries, null, 2)}`);

      return queries;
    } catch (parseError) {
      logger.error('Failed to parse LLM response:', parseError);
      return undefined;
    }
  } catch (error) {
    logger.error('Error generating SQL query:', error);
    throw new Error('Failed to generate SQL query');
  }
}

/**
 * Format the database schema in a way that's easy for the LLM to understand
 */
export function formatDbSchemaForLLM(schema: Table[]): string {
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

export async function detectDatabaseTypeFromPrompt(
  userPrompt: string,
  availableTypes: string[] = ['postgres', 'mysql', 'sqlite', 'mongodb'],
): Promise<string | null> {
  const llm = await getLlm();

  logger.info(`Detecting database type for prompt: ${userPrompt} using model: ${llm.instance.modelId}`);

  const systemPrompt = `You are a database expert tasked with analyzing user prompts to determine which type of database they are most likely referring to.

Available database types: ${availableTypes.join(', ')}

Analyze the user's prompt for indicators that suggest a specific database type:

For SQL databases (postgres, mysql, sqlite):
- SQL keywords (SELECT, FROM, WHERE, JOIN, etc.)
- Table/column terminology
- Relational database concepts
- SQL-specific syntax

For MongoDB:
- NoSQL terminology (collection, document, field)
- MongoDB-specific operators ($match, $group, $aggregate, etc.)
- JSON-like query structure mentions
- Document database concepts

Consider these factors:
1. Explicit database technology mentions
2. Query syntax patterns
3. Data modeling terminology
4. Database-specific features or operators

User prompt to analyze:
<user_prompt>
${userPrompt}
</user_prompt>

Provide your analysis in the following JSON format:
{
  "detectedType": "postgres|mysql|sqlite|mongodb",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of why you chose this database type"
}

If the prompt doesn't contain enough information to make a confident determination, choose the most common type (postgres) with low confidence.`;

  try {
    const result = await generateObject({
      schema: getDatabaseTypeDetectionSchema(),
      model: llm.instance,
      maxTokens: llm.maxOutputTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    if (!result?.object) {
      logger.error('No result object received from LLM for database type detection.');
      return null;
    }

    const { detectedType, confidence, reasoning } = result.object;

    logger.info(`Database type detection for prompt: ${userPrompt}`);
    logger.info('Detection reasoning:', reasoning);
    logger.info(`Detected type: ${detectedType} (confidence: ${confidence})`);

    return detectedType;
  } catch (error) {
    logger.error('Error detecting database type:', error);
    return null;
  }
}

export async function shouldGenerateSqlQueries(userPrompt: string, existingQueries?: string[]): Promise<boolean> {
  const llm = await getLlm();
  logger.info(`Deciding should SQL be generated for prompt: ${userPrompt} using model: ${llm.instance.modelId}`);

  const systemPrompt = `You are an experienced software engineer and an SQL expert tasked with determining whether a user's request requires updating existing SQL queries or not.
You will be provided with the current SQL queries and the user's prompt. Your goal is to analyze the user's intent and decide if the request requires changes to the SQL queries or if it's related to UI layout and appearance modifications.

First, review the existing SQL queries:

${
  existingQueries
    ? `<sql_queries>
${existingQueries}
</sql_queries>`
    : ''
}

Now, consider the user's prompt:

<user_prompt>
${userPrompt}
</user_prompt>

Analyze the user's prompt carefully, comparing it to the existing SQL queries. Determine whether the user's request implies a need to modify the SQL queries or if it's primarily focused on UI changes.

Think through your reasoning step by step. Consider the following:
1. Does the user explicitly mention changing data retrieval or filtering?
2. Are there keywords that suggest database-level changes?
3. Does the request focus on visual elements, layout, or UI components?
4. Could the user's request be fulfilled without altering the SQL queries?

Be thorough in your explanation, but concise.

Based on your analysis, make a decision on whether the SQL queries should be updated. Output your decision in the following JSON format:
{
  "shouldUpdateSql": true/false,
  "explanation": "Your detailed explanation here"
}

Remember, your task is to determine if SQL updates are necessary based on the user's prompt, not to actually modify the SQL queries or suggest UI changes.`;

  try {
    const result = await generateObject({
      schema: queryDecisionSchema,
      model: llm.instance,
      maxTokens: llm.maxOutputTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    if (!result?.object) {
      logger.error('No result object received from LLM for should generate sql queries decision.');
      return false;
    }

    const { shouldUpdateSql, explanation } = result.object;

    logger.info(`Determining should SQL be generated for prompt: ${userPrompt}`);
    logger.info('Should generate SQL reasoning:', explanation);
    logger.info(`Should generate SQL answer: ${shouldUpdateSql}`);

    return shouldUpdateSql;
  } catch (error) {
    logger.error('Error determining if SQL should be generated:', error);
    return false;
  }
}
