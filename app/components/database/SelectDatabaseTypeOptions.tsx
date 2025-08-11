import { components } from 'react-select';
import { SampleDatabaseTooltip } from './SampleDatabaseTooltip';
import { Lock } from 'iconsax-reactjs';
import { Check } from 'lucide-react';
import { SAMPLE_DATABASE, useDataSourceTypesPlugin } from '~/lib/hooks/plugins/useDataSourceTypesPlugin';

export const SingleValueWithTooltip = (props: any) => {
  return (
    <components.SingleValue {...props}>
      <div className="flex items-center">
        <span>{props.data.label}</span>
        {props.data.value === SAMPLE_DATABASE && <SampleDatabaseTooltip />}
        {props.data.status !== 'available' && (
          <span className="ml-2 text-red-500 flex items-center">
            <Lock size={16} variant="Bold" />
          </span>
        )}
      </div>
    </components.SingleValue>
  );
};

export function SelectDatabaseTypeOptions(props: any) {
  const { availableDataSourceOptions, lockedDataSourceOptions, comingSoonDataSourceOptions } =
    useDataSourceTypesPlugin();

  return (
    <components.MenuList {...props} className="bg-elements-depth-2">
      {availableDataSourceOptions.map((opt) => (
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
              <span className="text-base text-gray-100 ml-2">
                <Check className="w-4 h-4" />
              </span>
            )}
          </div>
        </components.Option>
      ))}
      {lockedDataSourceOptions.length > 0 && (
        <div className="text-primary text-xs mt-2 mb-2 px-3 font-light cursor-default opacity-70">
          Premium (requires license)
        </div>
      )}
      {lockedDataSourceOptions.map((opt) => (
        <div
          key={opt.value}
          className="flex hover:cursor-not-allowed items-center justify-between w-full px-3 py-2 rounded-lg text-left text-sm text-primary font-medium opacity-60 cursor-default"
        >
          <span className="flex items-center gap-2">
            {opt.label}
            <Lock size={16} variant="Bold" className="text-red-500" />
          </span>
        </div>
      ))}
      {comingSoonDataSourceOptions.length > 0 && (
        <div className="text-primary text-xs mt-2 mb-2 px-3 font-light cursor-default opacity-70">Coming soon</div>
      )}
      {comingSoonDataSourceOptions.map((opt) => (
        <div
          key={opt.value}
          className="hover:cursor-not-allowed flex items-center justify-between w-full px-3 py-2 rounded-lg text-left text-sm text-primary font-medium opacity-60 cursor-default"
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
