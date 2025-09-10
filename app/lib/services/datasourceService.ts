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
import { createEnvironmentVariable, decryptEnvironmentVariable } from './environmentVariablesService';
import { getEnvironmentName } from './environmentService';
import {
  type DataSourceProperty as SimpleDataSourceProperty,
  DataSourcePropertyType as SharedDataSourcePropertyType,
  type DataSourceType as SharedDataSourceType,
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
    dataSourceProperties: eds.dataSourceProperties.map((dsp) => {
      try {
        return {
          ...dsp,
          environmentVariable: decryptEnvironmentVariable(dsp.environmentVariable),
        };
      } catch {
        // Return the environment variable with a placeholder value to avoid breaking the entire request
        return {
          ...dsp,
          environmentVariable: {
            ...dsp.environmentVariable,
            value: '[DECRYPTION_FAILED]',
          },
        };
      }
    }),
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
    dataSourceProperties: environmentDataSource.dataSourceProperties.map((dsp) => {
      try {
        return {
          ...dsp,
          environmentVariable: decryptEnvironmentVariable(dsp.environmentVariable),
        };
      } catch {
        return {
          ...dsp,
          environmentVariable: {
            ...dsp.environmentVariable,
            value: '[DECRYPTION_FAILED]',
          },
        };
      }
    }),
  };
}

export async function createDataSource(data: {
  name: string;
  type: DataSourceType;
  environmentId: string;
  properties: SimpleDataSourceProperty[];
  createdById: string;
}): Promise<DataSource> {
  await validateDataSourceProperties(data.properties, data.type);

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

export async function getDataSourceConnectionUrl(
  userId: string,
  dataSourceId: string,
  environmentId: string,
): Promise<string | null> {
  const dataSourceProperties = await getDataSourceProperties(userId, dataSourceId, environmentId);

  if (!dataSourceProperties) {
    return null;
  }

  const connectionUrl = dataSourceProperties.find(
    (prop) => prop.type === SharedDataSourcePropertyType.CONNECTION_URL,
  )?.value;

  if (!connectionUrl) {
    return null;
  }

  // Special handling for Google Sheets to include OAuth tokens and Apps Script URL
  // Check if this is a Google Sheets URL and if we have additional properties
  if (connectionUrl.includes('docs.google.com/spreadsheets/')) {
    const accessToken = dataSourceProperties.find(
      (prop) => prop.type === SharedDataSourcePropertyType.ACCESS_TOKEN,
    )?.value;
    const refreshToken = dataSourceProperties.find(
      (prop) => prop.type === SharedDataSourcePropertyType.REFRESH_TOKEN,
    )?.value;

    // Look for Apps Script URL in client_id field (commonly used for additional URLs)
    const appsScriptUrl = dataSourceProperties.find(
      (prop) => prop.type === SharedDataSourcePropertyType.CLIENT_ID,
    )?.value;

    if (accessToken && refreshToken) {
      // Create sheets:// URL with tokens for the accessor
      const urlMatch = connectionUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);

      if (urlMatch) {
        const spreadsheetId = urlMatch[1];
        let url = `sheets://${spreadsheetId}/?access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`;

        // Add Apps Script URL if present
        if (appsScriptUrl) {
          url += `&appsScript=${encodeURIComponent(appsScriptUrl)}`;
        }

        return url;
      }
    }

    // For public access, add Apps Script URL as parameter if present
    if (appsScriptUrl) {
      const separator = connectionUrl.includes('?') ? '&' : '?';
      return `${connectionUrl}${separator}appsScript=${encodeURIComponent(appsScriptUrl)}`;
    }

    // Return the original URL for public access
    return connectionUrl;
  }

  return connectionUrl;
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
    // Use dataSource.id to ensure uniqueness
    const envVarKey = `${environmentName}_SAMPLE_${dataSource.id}_${DataSourcePropertyType.CONNECTION_URL}`
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

export async function updateDataSource(data: {
  id: string;
  name: string;
  type: DataSourceType;
  properties: SimpleDataSourceProperty[];
  userId: string;
}) {
  await validateDataSourceProperties(data.properties, data.type);

  return prisma.dataSource.update({
    where: { id: data.id, createdById: data.userId },
    data: { name: data.name },
  });
}

export async function deleteDataSource(id: string, userId: string) {
  prisma.dataSourceProperty.deleteMany({ where: { dataSourceId: id } });

  return prisma.dataSource.delete({ where: { id, createdById: userId } });
}

export async function getDataSourceType(dataSourceId: string) {
  const dataSource = await prisma.dataSource.findUnique({
    where: { id: dataSourceId },
    select: { type: true },
  });

  return dataSource?.type || null;
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
      value: decryptEnvironmentVariable(property.environmentVariable).value,
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
