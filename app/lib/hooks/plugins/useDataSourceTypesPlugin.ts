'use client';

import { usePluginStore } from '~/lib/plugins/plugin-store';
import { useDataSourceTypesStore } from '~/lib/stores/dataSourceTypes';
import { useMemo } from 'react';
import { type DataAccessPluginId, PluginType } from '~/lib/plugins/types';
import { type DataSourcePropertyDescriptor, DataSourceType } from '@liblab/data-access/utils/types';

export type DataSourceOption = {
  value: string;
  label: string;
  type?: DataSourceType | ComingSoonDataSource;
  properties: DataSourcePropertyDescriptor[];
  status: 'available' | 'locked' | 'coming-soon';
};
export const SAMPLE_DATABASE = 'sample';
export const SAMPLE_DATABASE_NAME = 'Sample Database';

export enum ComingSoonDataSource {
  SALESFORCE = 'SALESFORCE',
  JIRA = 'JIRA',
}

export const DEFAULT_DATA_SOURCES: DataSourceOption[] = [
  {
    value: SAMPLE_DATABASE,
    label: SAMPLE_DATABASE_NAME,
    properties: [],
    status: 'available',
    type: DataSourceType.SQLITE,
  },
  {
    value: 'salesforce',
    label: 'Salesforce',
    properties: [],
    status: 'coming-soon',
    type: ComingSoonDataSource.SALESFORCE,
  },
  { value: 'jira', label: 'Jira', properties: [], status: 'coming-soon', type: ComingSoonDataSource.JIRA },
];

type DataSourceTypesHook = () => {
  allDataSourceOptions: DataSourceOption[];
  availableDataSourceOptions: DataSourceOption[];
  lockedDataSourceOptions: DataSourceOption[];
  comingSoonDataSourceOptions: DataSourceOption[];
};

export const useDataSourceTypesPlugin: DataSourceTypesHook = () => {
  const { pluginAccess } = usePluginStore();
  const { dataSourceTypes } = useDataSourceTypesStore();

  const allDataSourceTypes = useMemo(
    () => [
      ...DEFAULT_DATA_SOURCES,
      ...dataSourceTypes.map(({ value, label, properties, type }) => ({
        value,
        label,
        type,
        properties,
        status:
          value === SAMPLE_DATABASE
            ? 'available'
            : pluginAccess[PluginType.DATA_ACCESS][value as DataAccessPluginId]
              ? 'available'
              : 'locked',
      })),
    ],
    [dataSourceTypes, pluginAccess],
  ) as DataSourceOption[];

  const available = allDataSourceTypes.filter((opt) => opt.status === 'available');
  const locked = allDataSourceTypes.filter((opt) => opt.status === 'locked');
  const comingSoon = allDataSourceTypes.filter((opt) => opt.status === 'coming-soon');

  return {
    allDataSourceOptions: allDataSourceTypes,
    availableDataSourceOptions: available,
    lockedDataSourceOptions: locked,
    comingSoonDataSourceOptions: comingSoon,
  };
};
