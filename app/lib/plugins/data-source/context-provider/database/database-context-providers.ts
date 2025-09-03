import { DataAccessor } from '@liblab/data-access/dataAccessor';
import { getSchemaCache } from '~/lib/schema';
import { getLlm } from '~/lib/.server/llm/get-llm';
import { logger } from '~/utils/logger';
import { generateObject } from 'ai';
import { mapSqlQueriesToPrompt } from '~/lib/common/prompts/sql';
import type {
  AdditionalContextInput,
  AdditionalContextOutput,
  DataSourceContextProvider,
} from '~/lib/plugins/data-source/context-provider/data-source-context-provider';
import { formatDbSchemaForPrompt } from '~/lib/plugins/data-source/context-provider/database/utils';
import {
  databaseQueriesSchema,
  type DatabaseQueryOutput,
  databaseQuerySchema,
  type Table,
} from '~/lib/plugins/data-source/context-provider/database/types';
import type { DataSourceType } from '@liblab/data-access/utils/types';
import { DataSourcePropertyType } from '@prisma/client';

export abstract class DatabaseContextProvider implements DataSourceContextProvider {
  async getContext({ environmentDataSource, userPrompt }: AdditionalContextInput): Promise<AdditionalContextOutput> {
    const dataSource = environmentDataSource.dataSource;
    const accessor = DataAccessor.getDatabaseAccessor(dataSource.type as DataSourceType);

    if (!accessor) {
      throw new Error(`No accessor found for database type: ${dataSource.type}`);
    }

    const connectionString = environmentDataSource.dataSourceProperties.find(
      (dsp) => dsp.type === DataSourcePropertyType.CONNECTION_URL,
    )?.environmentVariable?.value;

    if (!connectionString) {
      throw new Error('Connection string not found for data source');
    }

    const schema: Table[] = (await getSchemaCache(connectionString)) || (await accessor.getSchema());
    const formattedSchema = formatDbSchemaForPrompt(schema);

    logger.debug('Schema', schema);

    const systemPrompt = accessor.generateSystemPrompt(accessor.label, formattedSchema, [], userPrompt);

    try {
      const llm = await getLlm();

      logger.info(`Generating queries for prompt: ${userPrompt}, using model: ${llm.instance.modelId}`);

      const result = await generateObject({
        schema: databaseQueriesSchema,
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
          return {
            additionalContext: null,
            llmUsage: result?.usage,
          };
        }

        const queries: DatabaseQueryOutput = [];

        for (const query of parsedQueries) {
          try {
            const validatedQuery = databaseQuerySchema.parse(query);
            queries.push(validatedQuery);
          } catch (validationError) {
            logger.warn(
              `Skipping invalid query object: ${JSON.stringify(query)}\nValidation error: ${validationError}`,
            );
          }
        }

        if (queries.length === 0) {
          logger.info('No queries were successfully validated');

          return {
            additionalContext: null,
            llmUsage: result?.usage,
          };
        }

        logger.debug(`Generated queries: \n\n${JSON.stringify(queries, null, 2)}`);

        return {
          additionalContext: mapSqlQueriesToPrompt(queries),
          llmUsage: result?.usage,
        };
      } catch (parseError) {
        logger.error('Failed to parse LLM response:', parseError);
        return { additionalContext: null, llmUsage: result?.usage };
      }
    } catch (error) {
      logger.error('Error generating query:', error);
      throw new Error('Failed to generate query');
    }
  }
}

export class MySQLContextProvider extends DatabaseContextProvider {}
export class PostgresContextProvider extends DatabaseContextProvider {}
export class SQLiteContextProvider extends DatabaseContextProvider {}
export class MongoDBContextProvider extends DatabaseContextProvider {}
