import { components } from 'react-select';
import { SampleDatabaseTooltip } from './SampleDatabaseTooltip';

export enum DatabaseType {
  SAMPLE = 'sample',
  POSTGRES = 'postgres',
  MONGO = 'mongo',
  HUBSPOT = 'hubspot',
  SALESFORCE = 'salesforce',
  JIRA = 'jira',
  GITHUB = 'github',
}

export type DataSourceOption = {
  value: DatabaseType;
  label: string;
  available: boolean;
};

export const DATASOURCES: DataSourceOption[] = [
  { value: DatabaseType.SAMPLE, label: 'Sample Database', available: true },
  { value: DatabaseType.POSTGRES, label: 'PostgreSQL', available: true },
  { value: DatabaseType.MONGO, label: 'Mongo', available: false },
  { value: DatabaseType.HUBSPOT, label: 'Hubspot', available: false },
  { value: DatabaseType.SALESFORCE, label: 'Salesforce', available: false },
  { value: DatabaseType.JIRA, label: 'Jira', available: false },
  { value: DatabaseType.GITHUB, label: 'Github', available: false },
];

export const SingleValueWithTooltip = (props: any) => {
  return (
    <components.SingleValue {...props}>
      <div className="flex items-center">
        <span>{props.data.label}</span>
        {props.data.value === DatabaseType.SAMPLE && <SampleDatabaseTooltip />}
      </div>
    </components.SingleValue>
  );
};

export function SelectDatabaseTypeOptions(props: any) {
  const available = DATASOURCES.filter((opt) => opt.available);
  const comingSoon = DATASOURCES.filter((opt) => !opt.available);

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
          className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-left text-sm text-liblab-elements-textPrimary font-medium opacity-90 cursor-default"
        >
          <span>{opt.label}</span>
        </div>
      ))}
    </components.MenuList>
  );
}
