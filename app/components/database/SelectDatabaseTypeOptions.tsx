import { components } from 'react-select';
import { SampleDatabaseTooltip } from './SampleDatabaseTooltip';
import { useDataSourceTypesStore } from '~/lib/stores/dataSourceTypes';
import { useEffect } from 'react';

export type DataSourceOption = {
  value: string;
  label: string;
  available: boolean;
};

export const SAMPLE_DATABASE = 'sample';

export const DATASOURCES: DataSourceOption[] = [
  { value: SAMPLE_DATABASE, label: 'Sample Database', available: true },
  { value: 'mongo', label: 'Mongo', available: false },
  { value: 'hubspot', label: 'Hubspot', available: false },
  { value: 'salesforce', label: 'Salesforce', available: false },
  { value: 'jira', label: 'Jira', available: false },
  { value: 'github', label: 'Github', available: false },
];

export const SingleValueWithTooltip = (props: any) => {
  return (
    <components.SingleValue {...props}>
      <div className="flex items-center">
        <span>{props.data.label}</span>
        {props.data.value === SAMPLE_DATABASE && <SampleDatabaseTooltip />}
      </div>
    </components.SingleValue>
  );
};

export function SelectDatabaseTypeOptions(props: any) {
  useEffect(() => {
    fetchTypes();
  }, []);

  const { types, fetchTypes } = useDataSourceTypesStore();

  const allDataSources = [
    ...(types || []).map((type) => ({
      value: type.value,
      label: type.label,
      available: true,
    })),
    ...DATASOURCES,
  ];

  const available = allDataSources.filter((opt) => opt.available);
  const comingSoon = allDataSources.filter((opt) => !opt.available);

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
      <div className="text-liblab-elements-textPrimary text-xs mt-2 mb-2 px-3 font-light cursor-default opacity-70">
        Coming soon
      </div>
      {comingSoon.map((opt) => (
        <div
          key={opt.value}
          className="flex hover:cursor-not-allowed items-center justify-between w-full px-3 py-2 rounded-lg text-left text-sm text-liblab-elements-textPrimary font-medium opacity-90 cursor-default"
        >
          <span>{opt.label}</span>
        </div>
      ))}
    </components.MenuList>
  );
}
