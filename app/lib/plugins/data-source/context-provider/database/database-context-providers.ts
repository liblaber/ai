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
import type { ComplexEnvironmentDataSource } from '~/lib/services/datasourceService';
import type { BaseDatabaseAccessor } from '@liblab/data-access/baseDatabaseAccessor';

export abstract class DatabaseContextProvider implements DataSourceContextProvider {
  async getContext({ environmentDataSource, userPrompt }: AdditionalContextInput): Promise<AdditionalContextOutput> {
    const accessor = this._resolveAccessor(environmentDataSource.dataSource.type as DataSourceType);

    const connectionString = this._getConnectionString(environmentDataSource);

    await accessor.initialize(connectionString);

    const schema = await this._getDataSourceSchema(accessor, connectionString);

    const systemPrompt = accessor.generateSystemPrompt(accessor.label, schema, [], userPrompt);

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

        void accessor.close();

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

  async getSchema(environmentDataSource: ComplexEnvironmentDataSource): Promise<string> {
    const accessor = this._resolveAccessor(environmentDataSource.dataSource.type as DataSourceType);

    const connectionString = this._getConnectionString(environmentDataSource);

    await accessor.initialize(connectionString);

    const schema = await this._getDataSourceSchema(accessor, connectionString);

    void accessor.close();

    return schema;
  }

  private _getConnectionString(environmentDataSource: ComplexEnvironmentDataSource): string {
    const connectionString = environmentDataSource.dataSourceProperties.find(
      (dsp) => dsp.type === DataSourcePropertyType.CONNECTION_URL,
    )?.environmentVariable?.value;

    if (!connectionString) {
      throw new Error('Connection string not found for data source');
    }

    return connectionString;
  }

  private async _getDataSourceSchema(accessor: BaseDatabaseAccessor, connectionString: string): Promise<string> {
    const schema: Table[] = (await getSchemaCache(connectionString)) || (await accessor.getSchema());

    console.log('Fetched schema:', JSON.stringify(schema, null, 2));

    return formatDbSchemaForPrompt(schema);
  }

  private _resolveAccessor(dataSourceType: DataSourceType): BaseDatabaseAccessor {
    const accessor = DataAccessor.getDatabaseAccessor(dataSourceType as DataSourceType);

    if (!accessor) {
      throw new Error(`No accessor found for database type: ${dataSourceType}`);
    }

    return accessor;
  }
}

export class MySQLContextProvider extends DatabaseContextProvider {}
export class PostgresContextProvider extends DatabaseContextProvider {}
export class SQLiteContextProvider extends DatabaseContextProvider {}
export class MongoDBContextProvider extends DatabaseContextProvider {}

// TODO: https://linear.app/liblab/issue/ENG-966/adapt-google-sheets-docs-to-a-new-accessor-context-provider-style
export class GoogleSheetsContextProvider extends DatabaseContextProvider {}
export class GoogleDocsContextProvider extends DatabaseContextProvider {}
