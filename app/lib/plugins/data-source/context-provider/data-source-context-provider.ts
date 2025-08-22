import { type DataSource, DataSourceType } from '@prisma/client';
import { logger } from '~/utils/logger';
import { HubspotContextProvider } from '~/lib/plugins/data-source/context-provider/hubspot-context-provider';
import type { LanguageModelUsage } from 'ai';
import {
  MongoDBContextProvider,
  MySQLContextProvider,
  PostgresContextProvider,
  SQLiteContextProvider,
} from './database/database-context-providers';

export type AdditionalContextInput = {
  userPrompt: string;
  dataSource: DataSource;
  conversationSummary?: string;
  // @Lane To be changed to a more specific type if needed
  implementationPlan?: string;
};

export type AdditionalContextOutput = {
  additionalContext: string | null;
  /*
    If the LLM call was used for getting additional data source context, provider should return usage object
   */
  llmUsage?: LanguageModelUsage;
};

export interface DataSourceContextProvider {
  getContext(input: AdditionalContextInput): Promise<AdditionalContextOutput>;
}

export function resolveDataSourceContextProvider(dataSourceType: DataSourceType): DataSourceContextProvider | null {
  logger.debug(`Resolving data source context provider for type: ${dataSourceType}`);

  switch (dataSourceType) {
    case DataSourceType.POSTGRES:
      return new PostgresContextProvider();
    case DataSourceType.MYSQL:
      return new MySQLContextProvider();
    case DataSourceType.SQLITE:
      return new SQLiteContextProvider();
    case DataSourceType.MONGODB:
      return new MongoDBContextProvider();
    case DataSourceType.HUBSPOT:
      return new HubspotContextProvider();
    default:
      logger.warn(`Context provider for ${dataSourceType} not found`);
      return null;
  }
}
