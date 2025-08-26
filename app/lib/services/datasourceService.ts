import { prisma } from '~/lib/prisma';
import { DataSourcePluginManager } from '~/lib/plugins/data-access/data-access-plugin-manager';
import { buildResourceWhereClause } from '@/lib/casl/prisma-helpers';
import { PermissionAction, PermissionResource, Prisma } from '@prisma/client';
import type { AppAbility } from '~/lib/casl/user-ability';

export interface DataSource {
  id: string;
  name: string;
  connectionString: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getDataSource(id: string): Promise<DataSource | null> {
  return prisma.dataSource.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      connectionString: true,
      createdById: true,
      createdAt: true,
      updatedAt: true,
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
      createdById: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function createDataSource(data: {
  name: string;
  connectionString: string;
  createdById: string;
}): Promise<DataSource> {
  await validateDataSource(data.connectionString);

  return prisma.dataSource.create({
    data: {
      name: data.name,
      connectionString: data.connectionString,
      createdById: data.createdById,
    },
  });
}

export async function updateDataSource(data: { id: string; name: string; connectionString: string; userId: string }) {
  await validateDataSource(data.connectionString);

  return prisma.dataSource.update({
    where: { id: data.id, createdById: data.userId },
    data: { name: data.name, connectionString: data.connectionString },
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

export async function getConversationCount(dataSourceId: string, userId: string): Promise<number> {
  return prisma.conversation.count({
    where: {
      dataSourceId,
      userId,
    },
  });
}

async function validateDataSource(connectionString: string) {
  const accessor = await DataSourcePluginManager.getAccessor(connectionString);
  accessor.validate(connectionString);
}
