import { components } from 'react-select';
import { SampleDatabaseTooltip } from './SampleDatabaseTooltip';
import { useDataSourceTypesStore } from '~/lib/stores/dataSourceTypes';
import { useMemo } from 'react';
import { Lock } from 'iconsax-reactjs';
import { usePluginStore } from '~/lib/plugins/plugin-store';

export type DataSourceOption = {
  value: string;
  label: string;
  connectionStringFormat: string;
  available: boolean;
};

export const SAMPLE_DATABASE = 'sample';

export const DATASOURCES: DataSourceOption[] = [
  { value: SAMPLE_DATABASE, label: 'Sample Database', available: true, connectionStringFormat: '' },
  { value: 'mongo', label: 'Mongo', available: false, connectionStringFormat: '' },
  { value: 'hubspot', label: 'Hubspot', available: false, connectionStringFormat: '' },
  { value: 'salesforce', label: 'Salesforce', available: false, connectionStringFormat: '' },
  { value: 'jira', label: 'Jira', available: false, connectionStringFormat: '' },
  { value: 'github', label: 'Github', available: false, connectionStringFormat: '' },
];

export const SingleValueWithTooltip = (props: any) => {
  return (
    <components.SingleValue {...props}>
      <div className="flex items-center">
        <span>{props.data.label}</span>
        {props.data.value === SAMPLE_DATABASE && <SampleDatabaseTooltip />}
        {!props.data.available && (
          <span className="ml-2 text-red-500 flex items-center">
            <Lock size={16} variant="Bold" />
          </span>
        )}
      </div>
    </components.SingleValue>
  );
};

export function SelectDatabaseTypeOptions(props: any) {
  const { types } = useDataSourceTypesStore();

  const allDatabaseTypes = useMemo(
    () => [
      ...types.map(({ value, label, connectionStringFormat }) => ({
        value,
        label,
        connectionStringFormat,
        available: true,
      })),
      ...DATASOURCES,
    ],
    [types],
  );

  const { pluginAccess } = usePluginStore();

  const availableDatabaseTypes = useMemo(
    () => allDatabaseTypes.filter((type) => pluginAccess['data-access'][type.value]),
    [allDatabaseTypes, pluginAccess],
  );

  const available = availableDatabaseTypes.filter((opt) => opt.available);
  const locked = availableDatabaseTypes.filter((opt) => !opt.available);

  console.log({ available, locked, availableDatabaseTypes, allDatabaseTypes, pluginAccess });

  return (
    <components.MenuList {...props} className="bg-elements-depth-2">
      {available.map((opt) => (
        <components.Option
          key={opt.value}
          {...props}
          data={opt}
          isSelected={props.selectProps.value?.value === opt.value}
          isFocused={props.selectProps.value?.value === opt.value}
          innerProps={{
            ...props.innerProps,
            id: opt.value,
            className: 'cursor-pointer',
            onClick: () => props.selectOption(opt),
          }}
        >
          <div className="flex items-center justify-between w-full rounded-lg text-left text-sm font-medium py-1 px-2">
            <div className="flex items-center">
              <span>{opt.label}</span>
            </div>
            {props.selectProps.value?.value === opt.value && (
              <span className="i-ph:check-bold text-base text-gray-100 ml-2" />
            )}
          </div>
        </components.Option>
      ))}
      {locked.length > 0 && (
        <div className="text-liblab-elements-textPrimary text-xs mt-2 mb-2 px-3 font-light cursor-default opacity-70">
          Premium (requires license)
        </div>
      )}
      {locked.map((opt) => (
        <div
          key={opt.value}
          className="flex hover:cursor-not-allowed items-center justify-between w-full px-3 py-2 rounded-lg text-left text-sm text-liblab-elements-textPrimary font-medium opacity-60 cursor-default"
        >
          <span className="flex items-center gap-2">
            {opt.label}
            <Lock size={16} variant="Bold" className="text-red-500" />
          </span>
        </div>
      ))}
    </components.MenuList>
  );
}
