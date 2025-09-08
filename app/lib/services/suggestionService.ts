import { generateObject } from 'ai';
import { z } from 'zod';
import { DataAccessor } from 'shared/src/data-access/dataAccessor';
import { getLlm } from '~/lib/.server/llm/get-llm';

import { logger } from '~/utils/logger';
import { getSchemaCache, getSuggestionsCache, setSuggestionsCache } from '~/lib/schema';
import { formatDbSchemaForPrompt } from '~/lib/plugins/data-source/context-provider/database/utils';
import type { DataSourceType } from '@liblab/data-access/utils/types';

/**
 * Returns a random subset of suggestions from the provided array
 * @param suggestions - Array of all suggestions
 * @param count - Number of suggestions to return
 * @returns Array of randomly selected suggestions
 */
function getRandomSuggestions(suggestions: string[], count: number): string[] {
  const shuffled = [...suggestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

const suggestionResponseSchema = z.object({
  suggestions: z.array(z.string().max(128)).length(12),
});

type GenerateSuggestionsProps = {
  connectionString: string;
  dataSourceId: string;
  dataSourceType: DataSourceType;
};

/**
 * Generates contextual suggestions based on the database schema
 * TODO @Lane add Doc
 * @returns Promise<string[]> - Array of 3 suggestion prompts
 */
export async function generateSchemaBasedSuggestions({
  connectionString,
  dataSourceType,
  dataSourceId,
}: GenerateSuggestionsProps): Promise<string[]> {
  try {
    // Check cache first (31 days TTL)
    const cachedSuggestions = await getSuggestionsCache(connectionString, 60 * 60 * 24 * 31);

    if (cachedSuggestions) {
      logger.info(`Found cached suggestions for data source ${dataSourceId}`);

      // Return 3 random suggestions from the cached array
      return getRandomSuggestions(cachedSuggestions, 3);
    }

    const accessor = DataAccessor.getDatabaseAccessor(dataSourceType);

    await accessor.initialize(connectionString);

    try {
      const schema = (await getSchemaCache(connectionString)) || (await accessor.getSchema());

      if (!schema) {
        throw new Error('Could not retrieve database schema');
      }

      const llm = await getLlm();

      const formattedSchema = formatDbSchemaForPrompt(schema);

      const systemPrompt = `You are an expert software architect and data analyst. Your task is to analyze a database schema and generate 12 compelling suggestion prompts that users could use to create meaningful applications, tools, and solutions.

Given the database schema below, generate 12 different types of suggestions that would be valuable and interesting to build. Consider:

1. **Web Applications**: Customer portals, admin panels, e-commerce platforms, content management systems
2. **Data Dashboards**: Business intelligence dashboards, analytics visualizations, KPI monitoring
3. **Business Applications**: CRM systems, inventory management, project tracking, HR systems
4. **Analytics Platforms**: Reporting tools, data warehouses, business intelligence suites

Each suggestion should be:
- Specific to the data available in the schema
- Clear and actionable (e.g., "build a customer portal for order management")
- Focused on solving real business problems or creating value
- Concise but descriptive enough to understand the goal
- Diverse in scope (mix of different types of applications)
- Start with an action, followed by a subject (e.g. "create a revenue analytics app", "build an organization activity monitoring dashboard")

Database Schema:
${formattedSchema}

Generate exactly 12 suggestions that would be most valuable for this database. Make sure to vary the types of applications (e.g., don't suggest all dashboards). Output your response in the following JSON format:
{
  "suggestions": [
    "suggestion 1",
    "suggestion 2",
    "suggestion 3",
    "suggestion 4",
    "suggestion 5",
    "suggestion 6",
    "suggestion 7",
    "suggestion 8",
    "suggestion 9",
    "suggestion 10",
    "suggestion 11",
    "suggestion 12"
  ]
}

Make sure that the suggestions are not too long, at most 6-7 words.
`;

      // Generate suggestions using LLM
      const result = await generateObject({
        schema: suggestionResponseSchema,
        model: llm.instance,
        maxTokens: llm.maxOutputTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: 'Generate 12 suggestions based on this schema.' }],
      });

      if (!result?.object) {
        throw new Error('Failed to create suggestions');
      }

      const allSuggestions = result.object.suggestions;

      await setSuggestionsCache(connectionString, allSuggestions, schema);

      logger.info(`Generated and cached 12 schema-based suggestions for data source ${dataSourceId}`);

      // Return 3 random suggestions from the generated array
      return getRandomSuggestions(allSuggestions, 3);
    } finally {
      await accessor.close();
    }
  } catch (error) {
    logger.error('Error generating schema-based suggestions:', error);

    throw error;
  }
}
