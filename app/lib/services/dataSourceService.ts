import { prisma } from '~/lib/prisma';
import { DataSourcePluginManager } from '~/lib/plugins/data-access/data-access-plugin-manager';
import { buildResourceWhereClause } from '@/lib/casl/prisma-helpers';
import {
  DataSourcePropertyType,
  type EnvironmentDataSource,
  EnvironmentVariableType,
  PermissionAction,
  PermissionResource,
  Prisma,
} from '@prisma/client';
import type { AppAbility } from '~/lib/casl/user-ability';
import { createEnvironmentVariable, decryptEnvironmentVariable } from './environmentVariablesService';
import { getEnvironmentName } from './environmentService';

export interface DataSource {
  id: string;
  name: string;
  connectionString: string;
  environmentId: string;
  environmentName: string;
  createdAt: Date;
  updatedAt: Date;
}

const SAMPLE_DATABASE_CONNECTION_STRING = 'sqlite://sample.db';

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

export async function getEnvironmentDataSource(dataSourceId: string, userId: string, environmentId: string) {
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
    dataSourceProperties: environmentDataSource.dataSourceProperties.map((dsp) => ({
      ...dsp,
      environmentVariable: decryptEnvironmentVariable(dsp.environmentVariable),
    })),
  };
}

export async function createDataSource(data: {
  name: string;
  createdById: string;
  environmentId: string;
  connectionString: string;
}): Promise<DataSource> {
  validateDataSource(data.connectionString);

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
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Create EnvironmentDataSource relationship
    await tx.environmentDataSource.create({
      data: {
        environmentId: data.environmentId,
        dataSourceId: dataSource.id,
      },
    });

    // Create environment variable for connection url (if provided)
    const envVarKey = `${environmentName}_${data.name}_${DataSourcePropertyType.CONNECTION_URL}`
      .toUpperCase()
      .replace(/\s+/g, '_');

    const environmentVariable = await createEnvironmentVariable(
      envVarKey,
      data.connectionString!,
      EnvironmentVariableType.DATA_SOURCE,
      data.environmentId,
      data.createdById,
      `Database connection URL for ${data.name} in ${environmentName}`,
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
      connectionString: data.connectionString!,
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
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
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

export async function updateDataSource(data: { id: string; name: string; connectionString: string; userId: string }) {
  validateDataSource(data.connectionString);

  return prisma.dataSource.update({
    where: { id: data.id, createdById: data.userId },
    data: { name: data.name },
  });
}

export async function deleteDataSource(id: string, userId: string) {
  return prisma.dataSource.delete({ where: { id, createdById: userId } });
}

export async function getDatabaseUrl(
  userId: string,
  dataSourceId: string,
  environmentId: string,
): Promise<string | null> {
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
        where: {
          type: DataSourcePropertyType.CONNECTION_URL, // only connection URL property
        },
        include: {
          environmentVariable: true, // pull the encrypted env var
        },
      },
    },
  });

  if (!eds || eds.dataSourceProperties.length === 0) {
    return null;
  }

  const connectionProperty = eds.dataSourceProperties[0];
  const envVar = connectionProperty.environmentVariable;

  if (!envVar) {
    return null;
  }

  return decryptEnvironmentVariable(envVar).value;
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
