import { prisma } from '~/lib/prisma';
import { buildResourceWhereClause } from '@/lib/casl/prisma-helpers';
import {
  type DataSource as PrismaDataSource,
  type DataSourceProperty,
  DataSourcePropertyType,
  DataSourceType,
  type EnvironmentDataSource,
  type EnvironmentVariable,
  EnvironmentVariableType,
  PermissionAction,
  PermissionResource,
  Prisma,
} from '@prisma/client';
import type { AppAbility } from '~/lib/casl/user-ability';
import { createEnvironmentVariable, decryptEnvironmentVariable, encryptValue } from './environmentVariablesService';
import { getEnvironmentName } from './environmentService';
import type {
  DataSourceProperty as SimpleDataSourceProperty,
  DataSourcePropertyType as SharedDataSourcePropertyType,
  DataSourceType as SharedDataSourceType,
} from '@liblab/data-access/utils/types';

import { DataSourcePluginManager } from '~/lib/plugins/data-source/data-access-plugin-manager';

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  environmentId: string;
  environmentName: string;
  createdAt: Date;
  updatedAt: Date;
}

export const SAMPLE_DATABASE_CONNECTION_STRING = 'sqlite://sample.db';

export async function getEnvironmentDataSources(userAbility: AppAbility): Promise<EnvironmentDataSource[]> {
  // TODO: @skos Update specific permissions
  const whereClause = buildResourceWhereClause(
    userAbility,
    PermissionAction.read,
    PermissionResource.DataSource,
  ) as Prisma.DataSourceWhereInput;

  const environmentDataSources = await prisma.environmentDataSource.findMany({
    where: {
      dataSource: whereClause,
    },
    include: {
      environment: true,
      dataSource: true,
      dataSourceProperties: {
        include: {
          environmentVariable: true,
        },
      },
      conversations: true,
    },
    orderBy: [{ environment: { name: 'asc' } }, { dataSource: { name: 'asc' } }],
  });

  return environmentDataSources.map((eds) => ({
    ...eds,
    dataSourceProperties: eds.dataSourceProperties.map((dsp) => ({
      ...dsp,
      environmentVariable: decryptEnvironmentVariable(dsp.environmentVariable),
    })),
  }));
}

export type ComplexEnvironmentDataSource = EnvironmentDataSource & { dataSource: PrismaDataSource } & {
  dataSourceProperties: (DataSourceProperty & {
    environmentVariable: EnvironmentVariable;
  })[];
};

export async function getEnvironmentDataSource(
  dataSourceId: string,
  userId: string,
  environmentId: string,
): Promise<ComplexEnvironmentDataSource | null> {
  const environmentDataSource = await prisma.environmentDataSource.findUnique({
    where: {
      environmentId_dataSourceId: {
        environmentId,
        dataSourceId,
      },
    },
    include: {
      environment: true,
      dataSource: true,
      dataSourceProperties: {
        include: {
          environmentVariable: true,
        },
      },
      conversations: true,
    },
  });

  // TODO: @skos Update specific permissions
  // Verify user has access to this data source
  if (!environmentDataSource || environmentDataSource.dataSource.createdById !== userId) {
    return null;
  }

  return {
    ...environmentDataSource,
    environmentId: environmentDataSource.environmentId,
    dataSourceProperties: environmentDataSource.dataSourceProperties.map((dsp) => ({
      ...dsp,
      environmentVariable: decryptEnvironmentVariable(dsp.environmentVariable),
    })),
  };
}

export async function createDataSource(data: {
  name: string;
  type: DataSourceType;
  environmentId: string;
  properties: SimpleDataSourceProperty[];
  createdById: string;
}): Promise<DataSource> {
  validateDataSourceProperties(data.properties, data.type);

  // Get environment details for naming
  const environmentName = await getEnvironmentName(data.environmentId);

  if (!environmentName) {
    throw new Error('Environment not found');
  }

  // Use Prisma transaction to ensure full atomicity
  return prisma.$transaction(async (tx) => {
    // Create data source
    const dataSource = await tx.dataSource.create({
      data: {
        name: data.name,
        createdById: data.createdById,
        type: data.type,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        type: true,
      },
    });

    // Create EnvironmentDataSource relationship
    await tx.environmentDataSource.create({
      data: {
        environmentId: data.environmentId,
        dataSourceId: dataSource.id,
      },
    });

    for (const property of data.properties) {
      const envVarKey = `${environmentName}_${data.name}_${property.type}`.toUpperCase().replace(/\s+/g, '_');

      const environmentVariable = await createEnvironmentVariable(
        envVarKey,
        property.value,
        EnvironmentVariableType.DATA_SOURCE,
        data.environmentId,
        data.createdById,
        `Data source ${property.type} property for ${data.name} in ${environmentName}`,
        dataSource.id,
        tx, // Pass transaction for atomicity
      );

      await tx.dataSourceProperty.create({
        data: {
          type: property.type,
          environmentId: data.environmentId,
          dataSourceId: dataSource.id,
          environmentVariableId: environmentVariable.id,
        },
      });
    }

    return {
      ...dataSource,
      environmentId: data.environmentId,
      environmentName,
    };
  });
}

export async function createSampleDataSource(data: {
  createdById: string;
  environmentId: string;
}): Promise<DataSource> {
  const environmentName = await getEnvironmentName(data.environmentId);

  if (!environmentName) {
    throw new Error('Environment not found');
  }

  return prisma.$transaction(async (tx) => {
    // Create data source
    const dataSource = await tx.dataSource.create({
      data: {
        name: 'Sample Database',
        createdById: data.createdById,
        type: DataSourceType.SQLITE,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        type: true,
      },
    });

    await tx.environmentDataSource.create({
      data: {
        environmentId: data.environmentId,
        dataSourceId: dataSource.id,
      },
    });

    // Create environment variable for sample db connection url
    const envVarKey = `${environmentName}_SAMPLE_${DataSourcePropertyType.CONNECTION_URL}`
      .toUpperCase()
      .replace(/\s+/g, '_');

    const environmentVariable = await createEnvironmentVariable(
      envVarKey,
      SAMPLE_DATABASE_CONNECTION_STRING,
      EnvironmentVariableType.DATA_SOURCE,
      data.environmentId,
      data.createdById,
      `Database connection URL for Sample Database in ${environmentName}`,
      dataSource.id,
      tx, // Pass transaction for atomicity
    );

    await tx.dataSourceProperty.create({
      data: {
        type: DataSourcePropertyType.CONNECTION_URL,
        environmentId: data.environmentId,
        dataSourceId: dataSource.id,
        environmentVariableId: environmentVariable.id,
      },
    });

    return {
      ...dataSource,
      connectionString: SAMPLE_DATABASE_CONNECTION_STRING,
      environmentId: data.environmentId,
      environmentName,
    };
  });
}

export function getDataSource(id: string) {
  return prisma.dataSource.findUnique({ where: { id } });
}

// TODO: @skos update this and the routes and UI
export async function updateDataSource(data: {
  id: string;
  name: string;
  type: DataSourceType;
  properties: SimpleDataSourceProperty[];
  userId: string;
}) {
  validateDataSourceProperties(data.properties, data.type);

  return prisma.dataSource.update({
    where: { id: data.id, createdById: data.userId },
    data: { name: data.name },
  });
}

// TODO: @skos update this with environmentId (routes and UI as well)
export async function deleteDataSource(id: string, userId: string) {
  prisma.dataSourceProperty.deleteMany({ where: { dataSourceId: id } });

  return prisma.dataSource.delete({ where: { id, createdById: userId } });
}

export async function getDataSourceProperties(
  userId: string,
  dataSourceId: string,
  environmentId: string,
): Promise<SimpleDataSourceProperty[] | null> {
  const eds = await prisma.environmentDataSource.findFirst({
    where: {
      environmentId,
      dataSourceId,
      dataSource: {
        createdById: userId, // ownership check
      },
    },
    include: {
      dataSourceProperties: {
        include: {
          environmentVariable: true, // pull the encrypted env var
        },
      },
    },
  });

  if (!eds || eds.dataSourceProperties.length === 0) {
    return null;
  }

  return eds.dataSourceProperties.map((property) => {
    return {
      type: property.type as SharedDataSourcePropertyType,
      value: decryptEnvironmentVariable(property.environmentVariable).value, // still encrypted
    };
  });
}

export async function getDataSourceByConnectionString(connectionString: string) {
  const encryptedConnectionString = encryptValue(connectionString);

  return prisma.environmentDataSource
    .findFirst({
      where: {
        dataSourceProperties: {
          some: {
            type: DataSourcePropertyType.CONNECTION_URL,
            environmentVariable: {
              value: encryptedConnectionString,
            },
          },
        },
      },
    })
    .dataSource();
}

export async function getConversationCount(dataSourceId: string, userId: string): Promise<number> {
  return prisma.conversation.count({
    where: {
      dataSourceId,
      userId,
    },
  });
}

function validateDataSourceProperties(dataSourceProperties: SimpleDataSourceProperty[], type: DataSourceType) {
  const accessor = DataSourcePluginManager.getAccessor(type as SharedDataSourceType);
  accessor.validateProperties(dataSourceProperties);
}
