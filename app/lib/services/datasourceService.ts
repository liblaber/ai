import { prisma } from '~/lib/prisma';
import { DataAccessor } from '@liblab/data-access/dataAccessor';
import { DatabaseConnectionParser } from '~/utils/databaseConnectionParser';

export interface DataSource {
  id: string;
  name: string;
  connectionString: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getDataSource(id: string): Promise<DataSource | null> {
  return prisma.dataSource.findFirst({
    where: { id },
    select: {
      id: true,
      name: true,
      connectionString: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getDataSources(): Promise<DataSource[]> {
  return prisma.dataSource.findMany({
    select: {
      id: true,
      name: true,
      connectionString: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function createDataSource(data: { name: string; connectionString: string }) {
  validateDataSource(data.connectionString);

  return prisma.dataSource.create({
    data: {
      name: data.name,
      connectionString: data.connectionString,
    },
  });
}

export async function updateDataSource(data: { id: string; name: string; connectionString: string }) {
  validateDataSource(data.connectionString);

  return prisma.dataSource.update({
    where: { id: data.id },
    data: { name: data.name, connectionString: data.connectionString },
  });
}

export async function deleteDataSource(id: string) {
  return prisma.dataSource.delete({ where: { id } });
}

export async function getDatabaseUrl(datasourceId: string) {
  const dataSource = await prisma.dataSource.findUnique({
    where: { id: datasourceId },
    select: {
      connectionString: true,
    },
  });

  if (!dataSource) {
    throw new Error('Data source not found');
  }

  return dataSource.connectionString;
}

function validateDataSource(connectionString: string) {
  const availableDataSourceTypes = DataAccessor.getAvailableDatabaseTypes();
  const type = DatabaseConnectionParser.parse(connectionString).type;

  if (!availableDataSourceTypes.find(({ value }) => value === type)) {
    throw new Error(`Unsupported data source type: ${type}`);
  }
}
