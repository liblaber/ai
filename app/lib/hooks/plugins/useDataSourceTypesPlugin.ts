'use client';

import { usePluginStore } from '~/lib/plugins/plugin-store';
import { useDataSourceTypesStore } from '~/lib/stores/dataSourceTypes';
import { useMemo } from 'react';
import { type DataAccessPluginId, PluginType } from '~/lib/plugins/types';
import type { DataSourcePropertyDescriptor, DataSourceType } from '@liblab/data-access/utils/types';

export type DataSourceOption = {
  value: string;
  label: string;
  type?: DataSourceType;
  properties: DataSourcePropertyDescriptor[];
  status: 'available' | 'locked' | 'coming-soon';
};
export const SAMPLE_DATABASE = 'sample';
export const DEFAULT_DATA_SOURCES: DataSourceOption[] = [
  { value: SAMPLE_DATABASE, label: 'Sample Database', properties: [], status: 'available' },
  { value: 'salesforce', label: 'Salesforce', properties: [], status: 'coming-soon' },
  { value: 'jira', label: 'Jira', properties: [], status: 'coming-soon' },
  { value: 'github', label: 'Github', properties: [], status: 'coming-soon' },
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
      ...DEFAULT_DATA_SOURCES,
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
