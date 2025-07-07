import { prisma } from '~/lib/prisma';
import { DataSourcePluginManager } from '~/lib/plugins/data-access/data-access-plugin-manager';

export interface DataSource {
  id: string;
  name: string;
  connectionString: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getDataSource(id: string, userId: string): Promise<DataSource | null> {
  return prisma.dataSource.findFirst({
    where: { id, userId },
    select: {
      id: true,
      name: true,
      connectionString: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getDataSources(userId: string): Promise<DataSource[]> {
  return prisma.dataSource.findMany({
    select: {
      id: true,
      name: true,
      connectionString: true,
      createdAt: true,
      updatedAt: true,
    },
    where: { userId },
  });
}

export async function createDataSource(data: {
  name: string;
  connectionString: string;
  userId: string;
}): Promise<DataSource> {
  validateDataSource(data.connectionString);

  return prisma.dataSource.create({
    data: {
      name: data.name,
      connectionString: data.connectionString,
      userId: data.userId,
    },
  });
}

export async function updateDataSource(data: { id: string; name: string; connectionString: string; userId: string }) {
  validateDataSource(data.connectionString);

  return prisma.dataSource.update({
    where: { id: data.id, userId: data.userId },
    data: { name: data.name, connectionString: data.connectionString },
  });
}

export async function deleteDataSource(id: string, userId: string) {
  return prisma.dataSource.delete({ where: { id, userId } });
}

export async function getDatabaseUrl(userId: string, datasourceId: string) {
  const dataSource = await prisma.dataSource.findUnique({
    where: { id: datasourceId, userId },
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

function validateDataSource(connectionString: string) {
  const accessor = DataSourcePluginManager.getAccessor(connectionString);
  accessor.validate(connectionString);
}
