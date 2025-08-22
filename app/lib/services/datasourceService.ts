import { prisma } from '~/lib/prisma';
import { DataSourcePluginManager } from '~/lib/plugins/data-source/data-access-plugin-manager';
import { buildResourceWhereClause } from '@/lib/casl/prisma-helpers';
import { DataSourceType, PermissionAction, PermissionResource, Prisma } from '@prisma/client';
import type { AppAbility } from '~/lib/casl/user-ability';
import type { DataSourceProperty, DataSourceType as SharedDataSourceType } from '@liblab/data-access/utils/types';

export interface DataSource {
  id: string;
  name: string;
  connectionString: string;
  createdAt: Date;
  updatedAt: Date;
  type: DataSourceType;
}

export async function getDataSource(id: string, userId: string): Promise<DataSource | null> {
  return prisma.dataSource.findFirst({
    where: { id, createdById: userId },
    select: {
      id: true,
      name: true,
      connectionString: true,
      createdAt: true,
      updatedAt: true,
      type: true,
    },
  });
}

export async function getDataSources(userAbility: AppAbility): Promise<DataSource[]> {
  const whereClause = buildResourceWhereClause(
    userAbility,
    PermissionAction.read,
    PermissionResource.DataSource,
  ) as Prisma.DataSourceWhereInput;

  return prisma.dataSource.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      connectionString: true,
      createdAt: true,
      updatedAt: true,
      type: true,
    },
  });
}

export async function createDataSource(data: {
  name: string;
  type: DataSourceType;
  properties: DataSourceProperty[];
  createdById: string;
}): Promise<DataSource> {
  const accessor = DataSourcePluginManager.getAccessor(data.type as SharedDataSourceType);

  accessor.validateProperties(data.properties);

  const connectionString = extractDataSourceProperty(data.properties);

  return prisma.dataSource.create({
    data: {
      name: data.name,
      connectionString,
      createdById: data.createdById,
      type: data.type,
    },
  });
}

export async function updateDataSource(data: {
  id: string;
  name: string;
  type: DataSourceType;
  properties: any[];
  userId: string;
}) {
  const accessor = DataSourcePluginManager.getAccessor(data.type as SharedDataSourceType);

  accessor.validateProperties(data.properties);

  const connectionString = extractDataSourceProperty(data.properties);

  return prisma.dataSource.update({
    where: { id: data.id, createdById: data.userId },
    data: { name: data.name, connectionString },
  });
}

export async function deleteDataSource(id: string, userId: string) {
  return prisma.dataSource.delete({ where: { id, createdById: userId } });
}

export async function getDatabaseUrl(userId: string, datasourceId: string) {
  const dataSource = await prisma.dataSource.findUnique({
    where: { id: datasourceId, createdById: userId },
    select: {
      connectionString: true,
    },
  });

  if (!dataSource) {
    throw new Error('Data source not found');
  }

  return dataSource.connectionString;
}

export async function getDataSourceByConnectionString(connectionString: string) {
  return prisma.dataSource.findFirst({
    where: { connectionString },
    select: {
      id: true,
      name: true,
      connectionString: true,
      createdAt: true,
      updatedAt: true,
      type: true,
    },
  });
}

export async function getConversationCount(dataSourceId: string, userId: string): Promise<number> {
  return prisma.conversation.count({
    where: {
      dataSourceId,
      userId,
    },
  });
}

function extractDataSourceProperty(properties: DataSourceProperty[]): string {
  const firstProperty = properties?.[0];

  if (!firstProperty?.value) {
    throw new Error('Missing required fields');
  }

  return firstProperty.value;
}
