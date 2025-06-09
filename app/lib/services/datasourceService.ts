import { getInfisicalClient } from '~/lib/vault/client';
import { prisma } from '~/lib/prisma';
import { env } from '~/lib/config/env';
import { SSLMode } from '@prisma/client';

export interface DataSource {
  id: string;
  name: string;
  type: string;
  host: string;
  database: string;
  port: number;
  username: string;
  sslMode: SSLMode;
  createdAt: Date;
  updatedAt: Date;
}

export async function getDataSources(userId: string): Promise<DataSource[]> {
  return prisma.dataSource.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      type: true,
      host: true,
      database: true,
      port: true,
      username: true,
      sslMode: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function createDataSource(
  userId: string,
  data: {
    name: string;
    type: string;
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    sslMode: SSLMode;
  },
) {
  if (data.type !== 'postgres') {
    throw new Error('Only postgres data sources are supported');
  }

  const infisical = await getInfisicalClient();
  const secretName = `datasource-${Date.now()}-${data.name.toLowerCase().replace(/\s+/g, '-')}`;

  await infisical.secrets().createSecret(secretName, {
    environment: env.INFISICAL_ENVIRONMENT!,
    projectId: env.INFISICAL_PROJECT_ID!,
    secretValue: data.password,
  });

  return prisma.dataSource.create({
    data: {
      name: data.name,
      type: data.type,
      host: data.host,
      port: data.port,
      database: data.database,
      username: data.username,
      secretName,
      userId,
      sslMode: data.sslMode || SSLMode.DISABLE,
    },
  });
}

export async function getDatabaseUrl(userId: string, datasourceId: string) {
  const dataSource = await prisma?.dataSource.findUnique({
    where: { id: datasourceId, userId },
    select: {
      type: true,
      host: true,
      database: true,
      port: true,
      username: true,
      secretName: true,
      sslMode: true,
    },
  });

  if (!dataSource) {
    throw new Error('Data source not found');
  }

  const { type, host, database, port, username, secretName, sslMode } = dataSource;

  const password = await getDatasourcePassword(secretName);

  return `${type}://${username}:${encodeURIComponent(password)}@${host}:${port}/${database}?sslmode=${sslMode.toLowerCase()}`;
}

export async function getDatasourcePassword(secretName: string) {
  const infisical = await getInfisicalClient();
  const secret = await infisical.secrets().getSecret({
    secretName,
    projectId: env.INFISICAL_PROJECT_ID!,
    environment: env.INFISICAL_ENVIRONMENT!,
  });

  if (!secret.secretValue) {
    throw new Error('Failed to fetch secret');
  }

  return secret.secretValue;
}
