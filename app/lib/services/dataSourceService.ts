import { prisma } from '~/lib/prisma';
import type { DataSource, Environment, DataSourcePropertyType } from '@prisma/client';

export type { DataSource } from '@prisma/client';

// Legacy type for backward compatibility - actual return type is different
export type EnvironmentDataSourceLegacy = {
  id: string;
  name: string;
  environment: Environment;
  dataSources: DataSource[];
};

export async function getDatabaseUrl(userId: string, dataSourceId: string, environmentId?: string): Promise<string> {
  // Find the environment data source relationship
  const environmentDataSource = await prisma.environmentDataSource.findFirst({
    where: {
      dataSourceId,
      ...(environmentId && { environmentId }),
      dataSource: {
        createdById: userId,
      },
    },
    include: {
      dataSourceProperties: {
        where: {
          type: 'CONNECTION_URL' as DataSourcePropertyType,
        },
        include: {
          environmentVariable: true,
        },
      },
    },
  });

  if (!environmentDataSource) {
    throw new Error('Data source not found');
  }

  const connectionProperty = environmentDataSource.dataSourceProperties.find((prop) => prop.type === 'CONNECTION_URL');

  if (!connectionProperty) {
    throw new Error('Connection URL not found for data source');
  }

  return connectionProperty.environmentVariable.value;
}

export async function getEnvironmentDataSources(): Promise<any[]> {
  // Get all environment data source relationships
  const environmentDataSources = await prisma.environmentDataSource.findMany({
    include: {
      dataSource: true,
      environment: true,
      dataSourceProperties: {
        include: {
          environmentVariable: true,
        },
      },
    },
  });

  return environmentDataSources.map((eds) => ({
    createdAt: eds.createdAt,
    updatedAt: eds.updatedAt,
    dataSourceId: eds.dataSourceId,
    environmentId: eds.environmentId,
    environment: {
      id: eds.environment.id,
      name: eds.environment.name,
      description: eds.environment.description,
    },
    dataSource: {
      id: eds.dataSource.id,
      name: eds.dataSource.name,
      createdAt: eds.dataSource.createdAt,
      updatedAt: eds.dataSource.updatedAt,
    },
    dataSourceProperties:
      eds.dataSourceProperties.length > 0
        ? [
            {
              type: eds.dataSourceProperties[0].type,
              environmentVariables: [eds.dataSourceProperties[0].environmentVariable],
            },
          ]
        : [
            {
              type: 'CONNECTION_URL',
              environmentVariables: [],
            },
          ],
  }));
}

export async function getEnvironmentDataSource(
  id: string,
  userId: string,
  environmentId: string,
): Promise<DataSource | null> {
  const environmentDataSource = await prisma.environmentDataSource.findUnique({
    where: {
      environmentId_dataSourceId: {
        environmentId,
        dataSourceId: id,
      },
    },
    include: {
      dataSource: true,
    },
  });

  if (!environmentDataSource?.dataSource || environmentDataSource.dataSource.createdById !== userId) {
    return null;
  }

  return environmentDataSource.dataSource;
}

export async function createDataSource(data: {
  name: string;
  connectionString: string;
  environmentId: string;
  userId: string;
}): Promise<DataSource> {
  // Create the data source
  const dataSource = await prisma.dataSource.create({
    data: {
      name: data.name,
      createdById: data.userId,
    },
  });

  // Create the environment variable for the connection string
  const environmentVariable = await prisma.environmentVariable.create({
    data: {
      key: `${dataSource.name.toUpperCase().replace(/\s+/g, '_')}_CONNECTION_URL`,
      value: data.connectionString,
      type: 'DATA_SOURCE',
      environmentId: data.environmentId,
      createdById: data.userId,
    },
  });

  // Create the environment data source relationship
  await prisma.environmentDataSource.create({
    data: {
      environmentId: data.environmentId,
      dataSourceId: dataSource.id,
      dataSourceProperties: {
        create: {
          type: 'CONNECTION_URL' as DataSourcePropertyType,
          environmentVariableId: environmentVariable.id,
        },
      },
    },
  });

  return dataSource;
}

export async function createSampleDataSource(data: {
  name: string;
  connectionString: string;
  environmentId: string;
  userId: string;
}): Promise<DataSource> {
  return createDataSource(data);
}

export async function updateDataSource(
  id: string,
  userId: string,
  data: Partial<Pick<DataSource, 'name'>>,
): Promise<DataSource> {
  return prisma.dataSource.update({
    where: {
      id,
      createdById: userId,
    },
    data: {
      ...(data.name && { name: data.name }),
    },
  });
}

export async function deleteDataSource(id: string, userId: string): Promise<void> {
  await prisma.dataSource.delete({
    where: {
      id,
      createdById: userId,
    },
  });
}

export async function getDataSources(): Promise<any[]> {
  // Get all data sources with their connection strings
  const dataSources = await prisma.dataSource.findMany({
    include: {
      environments: {
        include: {
          dataSourceProperties: {
            where: {
              type: 'CONNECTION_URL' as DataSourcePropertyType,
            },
            include: {
              environmentVariable: true,
            },
          },
        },
      },
    },
  });

  return dataSources.map((ds) => {
    const connectionProperty = ds.environments[0]?.dataSourceProperties?.find((prop) => prop.type === 'CONNECTION_URL');

    return {
      ...ds,
      connectionString: connectionProperty?.environmentVariable?.value || '',
    };
  });
}

export async function getConversationCount(dataSourceId: string, userId: string): Promise<number> {
  // Get count of conversations that use this data source
  const count = await prisma.conversation.count({
    where: {
      userId,
      dataSourceId,
    },
  });

  return count;
}
