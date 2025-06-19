import { usePluginStore } from '~/lib/plugins/plugin-store';
import { useDataSourceTypesStore } from '~/lib/stores/dataSourceTypes';
import { useMemo } from 'react';

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
  allDatabaseTypes: DataSourceOption[];
  available: DataSourceOption[];
  locked: DataSourceOption[];
  comingSoon: DataSourceOption[];
};

export const useDataSourceTypesPlugin: DataSourceTypesHook = () => {
  const { pluginAccess } = usePluginStore();
  const { dataSourceTypes } = useDataSourceTypesStore();

  const allDatabaseTypes = useMemo(
    () => [
      ...dataSourceTypes.map(({ value, label, connectionStringFormat }) => ({
        value,
        label,
        connectionStringFormat,
        status: value === SAMPLE_DATABASE ? 'available' : pluginAccess['data-access'][value] ? 'available' : 'locked',
      })),
      ...DEFAULT_DATA_SOURCES,
    ],
    [dataSourceTypes],
  ) as DataSourceOption[];

  const available = allDatabaseTypes.filter((opt) => opt.status === 'available');
  const locked = allDatabaseTypes.filter((opt) => opt.status === 'locked');
  const comingSoon = allDatabaseTypes.filter((opt) => opt.status === 'coming-soon');

  return {
    allDatabaseTypes,
    available,
    locked,
    comingSoon,
  };
};
