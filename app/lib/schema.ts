import { type Table } from '@liblab/types';
import { createScopedLogger } from '~/utils/logger';
import { prisma } from '~/lib/prisma';
import crypto from 'crypto';
import { env } from '~/env/server';

import { getDatabaseUrl } from '~/lib/services/dataSourceService';
import { DataSourcePluginManager } from '~/lib/plugins/data-access/data-access-plugin-manager';
import { isGoogleSheetsConnection } from '@liblab/data-access/accessors/google-sheets';

// Cache duration in seconds (31 days)
const SCHEMA_CACHE_TTL = 60 * 60 * 24 * 31;

const logger = createScopedLogger('get-database-schema');

export const getDatabaseSchema = async (
  dataSourceId: string,
  environmentId: string,
  userId: string,
  forceRefresh = false,
): Promise<Table[]> => {
  const connectionUrl = await getDatabaseUrl(userId, dataSourceId, environmentId);

  if (!connectionUrl) {
    throw new Error('Missing required connection parameters');
  }

  const dataAccessor = await DataSourcePluginManager.getAccessor(connectionUrl);
  await dataAccessor.initialize(connectionUrl);

  try {
    logger.debug('Trying to get the schema from cache...');

    // For Google Sheets, check if we need to force refresh due to improved analysis
    const isGoogleSheets = isGoogleSheetsConnection(connectionUrl);
    let shouldForceRefresh = forceRefresh;

    if (isGoogleSheets && !forceRefresh) {
      const needsRefresh = await shouldRefreshGoogleSheetsCache(connectionUrl);
      logger.debug(`Google Sheets cache refresh check: ${needsRefresh}`);
      shouldForceRefresh = needsRefresh;
    }

    let schemaCache = null;

    if (!shouldForceRefresh) {
      schemaCache = await getSchemaCache(connectionUrl, SCHEMA_CACHE_TTL);
    }

    if (schemaCache && !shouldForceRefresh) {
      logger.debug('Schema cache hit!');
      return schemaCache;
    }

    if (shouldForceRefresh) {
      logger.debug('Force refreshing schema cache...');
    } else {
      logger.debug('Schema cache miss, fetching remote schema...');
    }

    const schema = await dataAccessor.getSchema();
    logger.debug('Remote schema fetched successfully!');

    // Add semantic mapping version marker for Google Sheets
    if (isGoogleSheets) {
      (schema as any)._semantic_mapping_version = 3; // Enhanced currency parsing for international symbols
      logger.debug('Added semantic mapping version 3 marker to Google Sheets schema');
    }

    await setSchemaCache(connectionUrl, schema);
    logger.debug('Schema cached successfully!');

    return schema;
  } catch (error) {
    logger.error('Error getting database schema:', error);
    throw new Error('Failed to get database schema');
  } finally {
    await dataAccessor.close();
  }
};

export async function getSchemaCache(
  connectionUrl: string,
  ttlSeconds: number = SCHEMA_CACHE_TTL,
): Promise<any | null> {
  const hash = hashConnectionUrl(connectionUrl);
  const now = new Date();
  const ttlMs = ttlSeconds * 1000;

  const cached = await prisma.schemaCache.findUnique({
    where: { connectionHash: hash },
  });

  if (!cached) {
    return null;
  }

  if (now.getTime() - cached.updatedAt.getTime() >= ttlMs) {
    return null;
  }

  return JSON.parse(cached.schemaData);
}

export async function setSchemaCache(connectionUrl: string, schema: any): Promise<string> {
  const hash = hashConnectionUrl(connectionUrl);

  const result = await prisma.schemaCache.upsert({
    where: { connectionHash: hash },
    update: {
      schemaData: JSON.stringify(schema),
    },
    create: {
      connectionHash: hash,
      schemaData: JSON.stringify(schema),
    },
  });

  return result.id;
}

export async function getSuggestionsCache(
  connectionUrl: string,
  ttlSeconds: number = SCHEMA_CACHE_TTL,
): Promise<string[] | null> {
  const hash = hashConnectionUrl(connectionUrl);
  const now = new Date();
  const ttlMs = ttlSeconds * 1000;

  const cached = await prisma.schemaCache.findUnique({
    where: { connectionHash: hash },
  });

  if (!cached || !cached.suggestions || cached.suggestions.length === 0) {
    return null;
  }

  if (now.getTime() - cached.updatedAt.getTime() >= ttlMs) {
    return null;
  }

  return cached.suggestions;
}

export async function setSuggestionsCache(
  connectionUrl: string,
  suggestions: string[],
  schema: Table[],
): Promise<string> {
  const hash = hashConnectionUrl(connectionUrl);

  const result = await prisma.schemaCache.upsert({
    where: { connectionHash: hash },
    update: {
      schemaData: JSON.stringify(schema),
      suggestions,
    },
    create: {
      connectionHash: hash,
      schemaData: JSON.stringify(schema),
      suggestions,
    },
  });

  return result.id;
}

export async function clearSchemaCache(connectionUrl: string): Promise<void> {
  const hash = hashConnectionUrl(connectionUrl);

  await prisma.schemaCache
    .delete({
      where: { connectionHash: hash },
    })
    .catch(() => {
      // Ignore if cache doesn't exist
    });

  logger.debug('Schema cache cleared for connection');
}

async function shouldRefreshGoogleSheetsCache(connectionUrl: string): Promise<boolean> {
  const hash = hashConnectionUrl(connectionUrl);

  const cached = await prisma.schemaCache.findUnique({
    where: { connectionHash: hash },
  });

  if (!cached) {
    return false; // No cache exists, normal flow will handle it
  }

  try {
    const schema = JSON.parse(cached.schemaData);

    // Enhanced semantic mapping with multi-row analysis
    // If cache doesn't have this version marker, force refresh
    const currentSemanticVersion = parseInt(env.GOOGLE_SHEETS_SEMANTIC_VERSION);

    if (!schema._semantic_mapping_version || schema._semantic_mapping_version < currentSemanticVersion) {
      logger.debug(
        `Google Sheets cache semantic version outdated (${schema._semantic_mapping_version ?? 'not set'} < ${currentSemanticVersion}), forcing refresh...`,
      );
      return true;
    }

    // Check if the cached schema has the old generic column names
    const hasGenericColumns = schema.some((table: any) =>
      table.columns?.some(
        (col: any) =>
          col.name?.match(/^column_[a-h]$/) &&
          col.description?.includes('Data from column') &&
          !col.description?.includes('Example values'),
      ),
    );

    if (hasGenericColumns) {
      logger.debug('Google Sheets cache has generic columns, forcing refresh...');
      return true;
    }

    return false;
  } catch (error) {
    logger.warn('Error parsing cached schema, forcing refresh:', error);
    return true;
  }
}

function hashConnectionUrl(url: string): string {
  return crypto.createHash('sha256').update(url).digest('hex');
}
