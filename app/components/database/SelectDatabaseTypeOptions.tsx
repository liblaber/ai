import { components } from 'react-select';

export type DataSourceOption = {
  value: string;
  label: string;
  available: boolean;
};

export const DATASOURCES: DataSourceOption[] = [
  { value: 'sample', label: 'Sample Database', available: true },
  { value: 'postgres', label: 'PostgreSQL', available: true },
  { value: 'mongo', label: 'Mongo', available: false },
  { value: 'hubspot', label: 'Hubspot', available: false },
  { value: 'salesforce', label: 'Salesforce', available: false },
  { value: 'jira', label: 'Jira', available: false },
  { value: 'github', label: 'Github', available: false },
];

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
            <span>{opt.label}</span>
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
