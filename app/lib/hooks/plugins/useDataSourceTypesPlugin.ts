import { usePluginStore } from '~/lib/plugins/plugin-store';
import { useDataSourceTypesStore } from '~/lib/stores/dataSourceTypes';
import { useMemo } from 'react';
import { type DataAccessPluginId, PluginType } from '~/lib/plugins/types';

export type DataSourceOption = {
  value: string;
  label: string;
  connectionStringFormat: string;
  status: 'available' | 'locked' | 'coming-soon';
};
export const SAMPLE_DATABASE = 'sample';
export const DEFAULT_DATA_SOURCES: DataSourceOption[] = [
  { value: SAMPLE_DATABASE, label: 'Sample Database', connectionStringFormat: '', status: 'available' },
  { value: 'mongo', label: 'Mongo', connectionStringFormat: '', status: 'coming-soon' },
  { value: 'hubspot', label: 'Hubspot', connectionStringFormat: '', status: 'coming-soon' },
  { value: 'salesforce', label: 'Salesforce', connectionStringFormat: '', status: 'coming-soon' },
  { value: 'jira', label: 'Jira', connectionStringFormat: '', status: 'coming-soon' },
  { value: 'github', label: 'Github', connectionStringFormat: '', status: 'coming-soon' },
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
      ...dataSourceTypes.map(({ value, label, connectionStringFormat }) => ({
        value,
        label,
        connectionStringFormat,
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
