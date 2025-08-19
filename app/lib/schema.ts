import { type Table } from '@liblab/types';
import { createScopedLogger } from '~/utils/logger';
import { prisma } from '~/lib/prisma';
import crypto from 'crypto';

import { getDatabaseUrl } from '~/lib/services/dataSourceService';
import { DataSourcePluginManager } from '~/lib/plugins/data-access/data-access-plugin-manager';

// Cache duration in seconds (31 days)
const SCHEMA_CACHE_TTL = 60 * 60 * 24 * 31;

const logger = createScopedLogger('get-database-schema');

export const getDatabaseSchema = async (
  dataSourceId: string,
  environmentId: string,
  userId: string,
): Promise<Table[]> => {
  const connectionUrl = await getDatabaseUrl(userId, dataSourceId, environmentId);

  if (!connectionUrl) {
    throw new Error('Missing required connection parameters');
  }

  const dataAccessor = DataSourcePluginManager.getAccessor(connectionUrl);
  await dataAccessor.initialize(connectionUrl);

  try {
    logger.debug('Trying to get the schema from cache...');

    const schemaCache = await getSchemaCache(connectionUrl, SCHEMA_CACHE_TTL);

    if (schemaCache) {
      logger.debug('Schema cache hit!');
      return schemaCache;
    }

    logger.debug('Schema cache miss, fetching remote schema...');

    const schema = await dataAccessor.getSchema();
    logger.debug('Remote schema fetched successfully!');

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

function hashConnectionUrl(url: string): string {
  return crypto.createHash('sha256').update(url).digest('hex');
}
