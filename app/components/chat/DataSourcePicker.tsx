import React from 'react';
import { useEnvironmentDataSourcesStore } from '~/lib/stores/environmentDataSources';
import type { SelectOption as BaseSelectOption } from '~/components/ui/Select';
import { BaseSelect } from '~/components/ui/Select';
import { components } from 'react-select';
import IcDatabase from '~/icons/ic_database.svg';

interface SelectOption extends BaseSelectOption {
  environmentName?: string;
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
  const { environmentDataSources, selectedEnvironmentDataSource, setSelectedEnvironmentDataSource } =
    useEnvironmentDataSourcesStore();

  const options: SelectOption[] = [
    ...(environmentDataSources.length === 0
      ? [
          {
            value: 'no-data-source',
            label: 'No Data Source',
            isDisabled: true,
          },
        ]
      : environmentDataSources.map((eds) => ({
          value: `${eds.dataSourceId}:${eds.environmentId}`,
          label: eds.dataSource.name,
          environmentName: eds.environment.name,
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
    const dataSource = environmentDataSources.find(
      (eds) => eds.dataSourceId === dataSourceId && eds.environmentId === environmentId,
    );

    if (!dataSource) {
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
    onDataSourceChange?.(
      dataSourceId,
      environmentId,
      dataSource.dataSource.name,
      dataSource.environment.name || 'Unknown',
    );
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
          {data.environmentName && (
            <span className="text-xs bg-gray-600 text-gray-200 px-2 py-1 rounded-full">{data.environmentName}</span>
          )}
        </div>
      </components.Option>
    );
  };

  const SingleValue = (props: any) => {
    const { data } = props;
    return (
      <components.SingleValue {...props}>
        <div className="flex items-center gap-2">
          <span>{data.label}</span>
          {data.environmentName && (
            <span className="text-xs bg-gray-600 text-gray-200 px-2 py-1 rounded-full">{data.environmentName}</span>
          )}
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
      minWidth: '300px',
      maxWidth: '500px',
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
      : environmentDataSources.length === 0
        ? 'no-data-source'
        : null;

  return (
    <div className="flex items-center gap-2">
      <BaseSelect
        value={options.find((option) => option.value === selectedValue)}
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
