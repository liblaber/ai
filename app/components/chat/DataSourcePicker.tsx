import React from 'react';
import { useEnvironmentDataSourcesStore } from '~/lib/stores/environmentDataSources';
import type { SelectOption as BaseSelectOption } from '~/components/ui/Select';
import { BaseSelect } from '~/components/ui/Select';
import { components, type GroupBase } from 'react-select';
import IcDatabase from '~/icons/ic_database.svg';

interface SelectOption extends BaseSelectOption {
  environmentName?: string;
  dataSourceName?: string;
}

interface DataSourcePickerProps {
  onAddNew?: () => void;
  disabled?: boolean;
  placement?: 'top' | 'bottom';
  onDataSourceChange?: (
    dataSourceId: string,
    environmentId: string,
    dataSourceName: string,
    environmentName: string,
  ) => void;
}

export const DataSourcePicker: React.FC<DataSourcePickerProps> = ({
  onAddNew,
  disabled,
  onDataSourceChange,
  placement = 'bottom',
}) => {
  const { dataSources, selectedEnvironmentDataSource, setSelectedEnvironmentDataSource } =
    useEnvironmentDataSourcesStore();

  const options: (SelectOption | GroupBase<SelectOption>)[] = [
    ...(dataSources.length === 0
      ? [
          {
            value: 'no-data-source',
            label: 'No Data Source',
            isDisabled: true,
          },
        ]
      : dataSources.map((ds) => ({
          label: ds.name,
          options: ds.environments.map((env) => ({
            value: `${ds.id}:${env.id}`,
            label: env.name,
            dataSourceName: ds.name,
          })),
        }))),
    {
      value: 'add-new',
      label: '+ Add New Data Source',
      isAddNew: true,
    },
  ];

  const handleDataSourceChange = async (option: SelectOption | null) => {
    if (option?.value === 'add-new') {
      onAddNew?.();
      return;
    }

    if (!option?.value) {
      setSelectedEnvironmentDataSource(null, null);
      return;
    }

    const [dataSourceId, environmentId] = option.value.split(':');

    // Find the data source and environment names from the 'dataSources' list
    const dataSource = dataSources.find((ds) => ds.id === dataSourceId);
    const environment = dataSource?.environments.find((env) => env.id === environmentId);

    if (!dataSource || !environment) {
      return;
    }

    // Check if this is actually a change
    if (
      selectedEnvironmentDataSource.dataSourceId === dataSourceId &&
      selectedEnvironmentDataSource.environmentId === environmentId
    ) {
      return; // No change needed
    }

    setSelectedEnvironmentDataSource(dataSourceId, environmentId);

    // Call the prop function to handle the change
    onDataSourceChange?.(dataSourceId, environmentId, dataSource.name, environment.name);
  };

  const DropdownIndicator = (props: any) => {
    if (disabled) {
      return null;
    }

    return <components.DropdownIndicator {...props} />;
  };

  const Option = (props: any) => {
    const { data } = props;
    return (
      <components.Option {...props}>
        <div className="flex items-center justify-between w-full">
          <span>{data.label}</span>
        </div>
      </components.Option>
    );
  };

  const SingleValue = (props: any) => {
    // const { data } = props;

    const selectedDataSource = dataSources
      .flatMap((ds) => ds.environments.map((env) => ({ ...env, dataSourceName: ds.name, dataSourceId: ds.id })))
      .find(
        (env) =>
          env.dataSourceId === selectedEnvironmentDataSource.dataSourceId &&
          env.id === selectedEnvironmentDataSource.environmentId,
      );

    return (
      <components.SingleValue {...props}>
        <div className="flex items-center gap-2">
          <span>{selectedDataSource?.dataSourceName}</span>
        </div>
      </components.SingleValue>
    );
  };

  const customStyles = {
    control: (base: any) => ({
      ...base,
      backgroundColor: 'transparent',
      border: 'none',
      boxShadow: 'none',
      '&:hover': {
        border: 'none',
      },
      '&:active': {
        border: 'none',
      },
      paddingLeft: '4px',
      gap: '8px',
      minWidth: '100px',
      maxWidth: '400px',
      width: 'auto',
    }),
    valueContainer: (base: any) => ({
      ...base,
      padding: '0',
      gap: '8px',
    }),
    singleValue: (base: any) => ({
      ...base,
      margin: '0',
      color: 'var(--color-primary)',
      fontSize: '14px',
    }),
    menu: (base: any) => ({
      ...base,
      minWidth: '250px',
      borderRadius: '1rem',
      backgroundColor: 'var(--color-depth-2)',
      boxShadow: '0 4px 6px 2px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      marginTop: '0.25rem',
      cursor: 'pointer',
      border: '2px solid var(--color-depth-3)',
      zIndex: 9999,
      textAlign: 'initial',
    }),

    option: (base: any, state: any) => ({
      ...base,
      fontSize: '14px',
      backgroundColor: state.isSelected || state.isFocused ? 'var(--color-depth-2)' : 'transparent',
      color: 'var(--color-primary)',
      '&:hover': {
        color: 'var(--color-link)',
      },
      '&:active': {
        backgroundColor: 'var(--color-depth-2)',
      },
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
    }),
    indicatorSeparator: () => ({
      display: 'none',
    }),
    dropdownIndicator: (base: any) => ({
      ...base,
      padding: '0 2px',
      color: 'var(--color-primary)',
      '&:hover': {
        color: 'var(--color-primary)',
      },
    }),
  };

  // Find the currently selected option based on dataSourceId and environmentId
  const selectedValue =
    selectedEnvironmentDataSource.dataSourceId && selectedEnvironmentDataSource.environmentId
      ? `${selectedEnvironmentDataSource.dataSourceId}:${selectedEnvironmentDataSource.environmentId}`
      : dataSources.length === 0
        ? 'no-data-source'
        : null;

  const findOptionByValue = (value: string | null) => {
    if (!value) {
      return null;
    }

    for (const group of options) {
      if ('options' in group) {
        const found = group.options.find((opt: SelectOption) => opt.value === value);

        if (found) {
          return found;
        }
      } else if ('value' in group && group.value === value) {
        return group as SelectOption;
      }
    }

    return null;
  };

  return (
    <div className="flex items-center gap-2">
      <BaseSelect
        value={findOptionByValue(selectedValue)}
        onChange={handleDataSourceChange}
        options={options}
        isSearchable={false}
        controlIcon={<IcDatabase className="text-xl" />}
        isDisabled={disabled}
        components={{ DropdownIndicator, Option, SingleValue }}
        styles={customStyles}
        menuPlacement={placement}
        dataTestId={'data-source-picker-select'}
      />
    </div>
  );
};
