import { prisma, type PrismaTransaction } from '~/lib/prisma';
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
import {
  createEnvironmentVariable,
  decryptEnvironmentVariable,
  updateEnvironmentVariable,
} from './environmentVariablesService';
import { getEnvironmentName } from './environmentService';
import {
  type DataSourceProperty as SimpleDataSourceProperty,
  DataSourcePropertyType as SharedDataSourcePropertyType,
  type DataSourceType as SharedDataSourceType,
} from '@liblab/data-access/utils/types';

import { DataSourcePluginManager } from '~/lib/plugins/data-source/data-access-plugin-manager';
import { DataAccessor } from '@liblab/data-access/dataAccessor';
import { logger } from '~/utils/logger';

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  environmentId: string;
  environmentName: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ComplexEnvironmentDataSource = EnvironmentDataSource & {
  dataSource: PrismaDataSource & {
    typeLabel: string;
  };
} & {
  dataSourceProperties: (DataSourceProperty & {
    environmentVariable: EnvironmentVariable;
  })[];
} & {
  conversationCount: number;
};

export interface CreateDataSourceEnvironmentResponse {
  dataSourceId: string;
  environmentId: string;
}

export interface CreateDataSourceResponse {
  id: string;
  name: string;
  type: DataSourceType;
  createdById: string;
}

export const SAMPLE_DATABASE_CONNECTION_STRING = 'sqlite://sample.db';

export async function getEnvironmentDataSources(userAbility: AppAbility): Promise<ComplexEnvironmentDataSource[]> {
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

  return Promise.all(
    environmentDataSources.map(async (eds) => ({
      ...eds,
      dataSource: {
        ...eds.dataSource,
        typeLabel: await DataAccessor.getDataSourceLabel(eds.dataSource.type as SharedDataSourceType),
      },
      dataSourceProperties: eds.dataSourceProperties.map((dsp) => ({
        ...dsp,
        environmentVariable: decryptEnvironmentVariable(dsp.environmentVariable),
      })),
      conversationCount: eds.conversations?.length || 0,
    })),
  );
}

export async function getEnvironmentDataSource(
  dataSourceId: string,
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

  if (!environmentDataSource) {
    return null;
  }

  return {
    ...environmentDataSource,
    dataSource: {
      ...environmentDataSource.dataSource,
      typeLabel: await DataAccessor.getDataSourceLabel(environmentDataSource.dataSource.type as SharedDataSourceType),
    },
    environmentId: environmentDataSource.environmentId,
    dataSourceProperties: environmentDataSource.dataSourceProperties.map((dsp) => ({
      ...dsp,
      environmentVariable: decryptEnvironmentVariable(dsp.environmentVariable),
    })),
    conversationCount: environmentDataSource.conversations?.length || 0,
  };
}

export async function getDataSource({ id }: { id: string }) {
  return prisma.dataSource.findUnique({
    where: { id },
    include: {
      environments: true,
    },
  });
}

export async function getDataSourceEnvironmentIds(dataSourceId: string): Promise<string[]> {
  const envDataSources = await prisma.environmentDataSource.findMany({
    where: { dataSourceId },
    select: { environmentId: true },
  });

  return envDataSources.map((eds) => eds.environmentId);
}

export async function createDataSource(data: {
  name: string;
  type: DataSourceType;
  createdById: string;
}): Promise<CreateDataSourceResponse> {
  return prisma.dataSource.create({
    data: {
      name: data.name,
      createdById: data.createdById,
      type: data.type,
    },
  });
}

async function createDataSourceProperty(
  data: {
    property: SimpleDataSourceProperty;
    dataSourceId: string;
    dataSourceName: string;
    environmentId: string;
    environmentName: string;
    createdById: string;
  },
  tx: PrismaTransaction,
) {
  const { property, dataSourceId, dataSourceName, environmentId, createdById, environmentName } = data;
  const envVarKey = `${environmentName}_${dataSourceName}_${property.type}`.toUpperCase().replace(/\s+/g, '_');

  const environmentVariable = await createEnvironmentVariable(
    envVarKey,
    property.value,
    EnvironmentVariableType.DATA_SOURCE,
    environmentId,
    createdById,
    `Data source ${property.type} property for ${dataSourceName} in ${environmentName}`,
    dataSourceId,
    tx, // Pass transaction for atomicity
  );

  await tx.dataSourceProperty.create({
    data: {
      type: property.type,
      environmentId,
      dataSourceId,
      environmentVariableId: environmentVariable.id,
    },
  });
}

export async function createEnvironmentDataSource(data: {
  dataSourceId: string;
  environmentId: string;
  properties: SimpleDataSourceProperty[];
  createdById: string;
}): Promise<CreateDataSourceEnvironmentResponse> {
  const dataSource = await prisma.dataSource.findUnique({
    where: { id: data.dataSourceId },
    select: { id: true, name: true, type: true },
  });

  if (!dataSource) {
    throw new Error('Data source does not exist');
  }

  await validateDataSourceProperties(data.properties, dataSource.type);

  // Get environment details for naming
  const environmentName = await getEnvironmentName(data.environmentId);

  if (!environmentName) {
    throw new Error('Environment not found');
  }

  // Use Prisma transaction to ensure full atomicity
  return prisma.$transaction(async (tx) => {
    // Create EnvironmentDataSource relationship
    await tx.environmentDataSource.create({
      data: {
        environmentId: data.environmentId,
        dataSourceId: dataSource.id,
      },
    });

    for (const property of data.properties) {
      await createDataSourceProperty(
        {
          property,
          dataSourceId: dataSource.id,
          dataSourceName: dataSource.name,
          environmentId: data.environmentId,
          environmentName,
          createdById: data.createdById,
        },
        tx,
      );
    }

    return {
      dataSourceId: dataSource.id,
      environmentId: data.environmentId,
    };
  });
}

export async function getDataSourceConnectionUrl(
  userId: string,
  dataSourceId: string,
  environmentId: string,
): Promise<string | null> {
  const dataSourceProperties = await getDataSourceProperties(dataSourceId, environmentId);

  return dataSourceProperties?.find((prop) => prop.type === SharedDataSourcePropertyType.CONNECTION_URL)?.value || null;
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

export async function updateDataSource(
  id: string,
  data: {
    name: string;
    type?: DataSourceType;
  },
): Promise<PrismaDataSource> {
  return prisma.dataSource.update({
    where: { id },
    data: { name: data.name, ...(data.type ? { type: data.type } : {}) },
  });
}

export async function updateEnvironmentDataSourceProperties(data: {
  dataSourceId: string;
  environmentId: string;
  properties: SimpleDataSourceProperty[];
  userId: string;
}) {
  const environmentDataSource = await prisma.environmentDataSource.findUnique({
    where: {
      environmentId_dataSourceId: {
        environmentId: data.environmentId,
        dataSourceId: data.dataSourceId,
      },
    },
    include: {
      dataSource: true,
      environment: true,
    },
  });

  if (!environmentDataSource) {
    throw new Error('Data source environment does not exist');
  }

  const { dataSource } = environmentDataSource;

  await validateDataSourceProperties(data.properties, dataSource.type);

  const existingProperties = await prisma.dataSourceProperty.findMany({
    where: { dataSourceId: data.dataSourceId, environmentId: data.environmentId },
    include: { environmentVariable: true },
  });

  const propertyMap = new Map(existingProperties.map((prop) => [prop.type, prop]));

  return prisma.$transaction(async (tx) => {
    const upsertedPropertyTypes = new Set<DataSourcePropertyType>();

    for (const property of data.properties) {
      const existingProperty = propertyMap.get(property.type);

      if (existingProperty) {
        logger.debug(
          `Updating existing property of type ${property.type} for environment data source [${data.environmentId}, ${data.dataSourceId}]`,
        );

        await updateEnvironmentVariable(
          {
            id: existingProperty.environmentVariableId,
            key: existingProperty.environmentVariable.key,
            type: existingProperty.environmentVariable.type,
            environmentId: data.environmentId,
            description: existingProperty.environmentVariable.description,
            value: property.value,
          },
          tx,
        );
      } else {
        logger.debug(
          `Creating new property of type ${property.type} for environment data source [${data.environmentId}, ${data.dataSourceId}]`,
        );

        await createDataSourceProperty(
          {
            property,
            dataSourceId: dataSource.id,
            dataSourceName: dataSource.name,
            environmentId: data.environmentId,
            environmentName: environmentDataSource.environment.name,
            createdById: data.userId,
          },
          tx,
        );
      }

      upsertedPropertyTypes.add(property.type);
    }

    // Delete any properties that were not included in the update
    for (const existingProperty of existingProperties) {
      if (!upsertedPropertyTypes.has(existingProperty.type)) {
        logger.debug(
          `Deleting property of type ${existingProperty.type} for environment data source [${data.environmentId}, ${data.dataSourceId}]`,
        );

        await tx.dataSourceProperty.delete({
          where: { id: existingProperty.id },
        });
      }
    }
  });
}

export async function deleteDataSourceEnvironment(
  dataSourceId: string,
  environmentId: string,
  tx?: PrismaTransaction,
): Promise<void> {
  logger.debug(`Deleting environment data source [${environmentId}, ${dataSourceId}]`);

  const transactionFn: (fn: (tx: PrismaTransaction) => Promise<void>) => Promise<void> = tx
    ? (fn) => fn(tx)
    : (fn) => prisma.$transaction(fn);

  await transactionFn(async (tx) => {
    logger.debug(`Deleting conversation for environment data source [${environmentId}, ${dataSourceId}]`);

    await tx.conversation.deleteMany({
      where: {
        dataSourceId,
        environmentId,
      },
    });

    const dataSourceProperties = await tx.dataSourceProperty.findMany({
      where: { dataSourceId, environmentId },
    });

    for (const property of dataSourceProperties) {
      logger.debug(`Deleting environment variable [${property.environmentVariableId}] for property [${property.type}]`);

      await tx.environmentVariable.delete({
        where: { id: property.environmentVariableId },
      });
    }

    await tx.dataSourceProperty.deleteMany({ where: { dataSourceId, environmentId } });

    await tx.environmentDataSource.delete({
      where: {
        environmentId_dataSourceId: {
          environmentId,
          dataSourceId,
        },
      },
    });

    logger.debug(`Deleted environment data source [${environmentId}, ${dataSourceId}]`);
  });
}

export async function deleteDataSource(id: string) {
  await prisma.$transaction(async (tx) => {
    logger.debug(`Deleting data source [${id}]`);

    const environmentDataSources = await tx.environmentDataSource.findMany({ where: { dataSourceId: id } });

    for (const environmentDataSource of environmentDataSources) {
      await deleteDataSourceEnvironment(id, environmentDataSource.environmentId, tx);
    }

    await tx.dataSource.delete({ where: { id } });

    logger.debug(`Deleted data source [${id}]`);
  });
}

export async function getDataSourceType(dataSourceId: string) {
  const dataSource = await prisma.dataSource.findUnique({
    where: { id: dataSourceId },
    select: { type: true },
  });

  return dataSource?.type || null;
}

export async function getDataSourceProperties(
  dataSourceId: string,
  environmentId: string,
): Promise<SimpleDataSourceProperty[] | null> {
  const eds = await prisma.environmentDataSource.findFirst({
    where: {
      environmentId,
      dataSourceId,
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

export async function getConversationCount(dataSourceId: string, userId: string): Promise<number> {
  return prisma.conversation.count({
    where: {
      dataSourceId,
      userId,
    },
  });
}

async function validateDataSourceProperties(dataSourceProperties: SimpleDataSourceProperty[], type: DataSourceType) {
  const accessor = await DataSourcePluginManager.getAccessor(type as SharedDataSourceType);
  accessor.validateProperties(dataSourceProperties);
}
