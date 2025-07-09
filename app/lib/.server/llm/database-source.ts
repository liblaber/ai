import { logger } from '~/utils/logger';
import { generateObject, type LanguageModel } from 'ai';
import { z } from 'zod';

const queryDecisionSchema = z.object({
  shouldUpdateSql: z.boolean(),
  explanation: z.string(),
});

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
}

export interface Table {
  tableName: string;
  columns: Column[];
}

export async function generateSqlQueries(
  schema: Table[],
  userPrompt: string,
  model: LanguageModel,
  maxTokens: number,
  databaseType: string,
  existingQueries?: string[],
): Promise<SqlQueryOutput | undefined> {
  const dbSchema = formatDbSchemaForLLM(schema);

  const systemPrompt = `You are a SQL expert tasked with generating SQL queries based on a given database schema and user requirements.
Your goal is to create accurate, optimized queries that address the user's request while adhering to specific guidelines and output format.

You will be working with the following database type:
<databaseType>
${databaseType}
</databaseType>

${databaseType == 'sqlite' ? `Please use ? instead of $1 for placeholders in prepared statements` : ''}

Here is the database schema you should use:
<dbSchema>
${dbSchema}
</dbSchema>

${existingQueries ? `Here are the existing SQL queries used by the app the user is building. Use them as context if they need to be updated to fulfill the user's request: <existing_sql_queries>${existingQueries}</existing_sql_queries>` : ''}

To generate the SQL queries, follow these steps:
1. Carefully analyze the user's request and the provided database schema.
2. Create one or more SQL queries that accurately address the user's requirements.
3. Ensure the queries are compatible with the specified database type.
4. Prefer simple SQL syntax without relying heavily on database-specific functions.
5. Do not use any DDL (Data Definition Language) statements such as CREATE, ALTER, or DROP. Only DML (Data Manipulation Language) queries like SELECT, INSERT, UPDATE, and DELETE are allowed.
6. Use appropriate table joins if necessary.
7. Optimize the queries for performance.
8. Avoid using any tables or columns not present in the schema.
9. If needed, parametrize the query using positional placeholders like $1, $2, etc.
10. Use the exact format and casing for explicit values in the query (e.g., use "SUPER_ADMIN" if values are {ADMIN, MEMBER, SUPER_ADMIN}).
11. Provide a brief explanation for each query.
12. Specify the response schema for each query, including selected column types and any explicit values, if present.

Format your response as a JSON array containing objects with the following structure:
{
  "query": "Your SQL query here",
  "explanation": "A brief explanation of what the query does",
  "responseSchema": "column_name1 (data_type), column_name2 (data_type), ..."
}

Here's an example of a valid response:
[
  {
    "query": "SELECT u.name, u.email, u.role FROM users u WHERE u.role = 'ADMIN'",
    "explanation": "Retrieves names and email addresses of all admin users",
    "responseSchema": "name (text), email (text), role (text, {ADMIN,MEMBER,SUPER_ADMIN})"
  },
  {
    "query": "SELECT COUNT(*) as total_users FROM users",
    "explanation": "Counts the total number of users in the system",
    "responseSchema": "total_users (bigint)"
  },
  {
    "query": "SELECT b.build_number, b.start_time, b.end_time, b.status FROM builds b WHERE b.status IN ($1) AND b.api_id = $2",
    "explanation": "Retrieves all the builds for specific statuses and API",
    "responseSchema": "build_number (numeric), start_time (timestamp), end_time (timestamp), status (text, {SUCCESS,IN_PROGRESS,FAILURE})"
  }
]

IMPORTANT: Your output should consist ONLY of the JSON array containing the query objects. Do not include any additional text or explanations outside of this JSON structure.
IMPORTANT: Do not add additional formatting or characters to the query itself like \n or \t, just output plain text SQL query.

Now, generate SQL queries based on the following user request:
<userRequest>
${userPrompt}
</userRequest>`;

  try {
    logger.info(`Generating SQL for prompt: ${userPrompt}, using model: ${model.modelId}`);

    const result = await generateObject({
      schema: sqlQueriesSchema,
      model,
      system: systemPrompt,
      maxTokens,
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
    console.error('Error generating SQL query:', error);
    throw new Error('Failed to generate SQL query');
  }
}

/**
 * Format the database schema in a way that's easy for the LLM to understand
 */
function formatDbSchemaForLLM(schema: any): string {
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

export async function shouldGenerateSqlQueries(
  userPrompt: string,
  model: LanguageModel,
  maxTokens: number,
  existingQueries?: string[],
): Promise<boolean> {
  logger.info(`Deciding should SQL be generated for prompt: ${userPrompt} using model: ${model.modelId}`);

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
      model,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens,
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
