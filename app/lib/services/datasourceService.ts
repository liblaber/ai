import { prisma } from '~/lib/prisma';
import { SSL_MODE, type SSLMode } from '~/types/database';
import { DataAccessor } from '@liblab/data-access/dataAccessor';

export interface DataSource {
  id: string;
  name: string;
  type: string;
  host: string;
  database: string;
  port: number;
  username: string;
  sslMode: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getDataSources(): Promise<DataSource[]> {
  return prisma.dataSource.findMany({
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

export async function createDataSource(data: {
  name: string;
  type: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  sslMode: SSLMode;
}) {
  const availableDataSourceTypes = DataAccessor.getAvailableDatabaseTypes();

  if (!availableDataSourceTypes.find(({ value }) => value === data.type)) {
    throw new Error(`Unsupported data source type: ${data.type}`);
  }

  return prisma.dataSource.create({
    data: {
      name: data.name,
      type: data.type,
      host: data.host,
      port: data.port,
      database: data.database,
      username: data.username,
      password: data.password,
      sslMode: data.sslMode || SSL_MODE.DISABLE,
    },
  });
}

export async function getDatabaseUrl(datasourceId: string) {
  const dataSource = await prisma.dataSource.findUnique({
    where: { id: datasourceId },
    select: {
      type: true,
      host: true,
      database: true,
      port: true,
      username: true,
      password: true,
      sslMode: true,
    },
  });

  if (!dataSource) {
    throw new Error('Data source not found');
  }

  const { type, host, database, port, username, password, sslMode } = dataSource;

  return `${type}://${username}:${encodeURIComponent(password)}@${host}:${port}/${database}?sslmode=${sslMode.toLowerCase()}`;
}
