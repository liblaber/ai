import { generateObject } from 'ai';
import { z } from 'zod';
import { DataAccessor } from 'shared/src/data-access/dataAccessor';
import { type DataSource } from './datasourceService';
import { getLlm } from '~/lib/.server/llm/get-llm';

import { logger } from '~/utils/logger';
import { formatDbSchemaForLLM } from '~/lib/.server/llm/database-source';
import { getSchemaCache, getSuggestionsCache, setSuggestionsCache } from '~/lib/schema';

const suggestionResponseSchema = z.object({
  suggestions: z.array(z.string().max(128)).length(3),
});

/**
 * Generates contextual suggestions based on the database schema
 * @param dataSource - The ID of the data source
 * @returns Promise<string[]> - Array of 3 suggestion prompts
 */
export async function generateSchemaBasedSuggestions(dataSource: DataSource): Promise<string[]> {
  try {
    // Check cache first (31 days TTL)
    const cachedSuggestions = await getSuggestionsCache(dataSource.connectionString, 60 * 60 * 24 * 31);

    if (cachedSuggestions) {
      logger.info(`Found cached suggestions for data source ${dataSource.id}`);
      return cachedSuggestions;
    }

    const accessor = DataAccessor.getAccessor(dataSource.connectionString);

    await accessor.initialize(dataSource.connectionString);

    try {
      const schema = (await getSchemaCache(dataSource.connectionString)) || (await accessor.getSchema());

      const llm = await getLlm();

      const formattedSchema = formatDbSchemaForLLM(schema);

      const systemPrompt = `You are an expert software architect and data analyst. Your task is to analyze a database schema and generate 3 compelling suggestion prompts that users could use to create meaningful applications, tools, and solutions.

Given the database schema below, generate 3 different types of suggestions that would be valuable and interesting to build. Consider:

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

Generate exactly 3 suggestions that would be most valuable for this database. Make sure to vary the types of applications (e.g., don't suggest 3 dashboards). Output your response in the following JSON format:
{
  "suggestions": [
    "suggestion 1",
    "suggestion 2",
    "suggestion 3"
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
        messages: [{ role: 'user', content: 'Generate 3 suggestions based on this schema.' }],
      });

      if (!result?.object) {
        throw new Error('Failed to create suggestions');
      }

      const suggestions = result.object.suggestions;

      await setSuggestionsCache(dataSource.connectionString, suggestions, schema);

      logger.info(`Generated and cached schema-based suggestions for data source ${dataSource.id}`);

      return suggestions;
    } finally {
      await accessor.close();
    }
  } catch (error) {
    logger.error('Error generating schema-based suggestions:', error);

    throw error;
  }
}
