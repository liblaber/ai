import { type Table } from '@liblab/types';
import { prisma } from '~/lib/prisma';
import crypto from 'crypto';
import { createScopedLogger } from '~/utils/logger';

// Cache duration in seconds (31 days)
const SCHEMA_CACHE_TTL = 60 * 60 * 24 * 31;

const logger = createScopedLogger('get-database-schema');

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

function hashConnectionUrl(url: string): string {
  return crypto.createHash('sha256').update(url).digest('hex');
}
