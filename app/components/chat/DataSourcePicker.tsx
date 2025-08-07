import React from 'react';
import { useDataSourcesStore } from '~/lib/stores/dataSources';
import type { SelectOption } from '~/components/ui/Select';
import { BaseSelect } from '~/components/ui/Select';
import { components } from 'react-select';

interface DataSourcePickerProps {
  onAddNew?: () => void;
  disabled?: boolean;
}

export const DataSourcePicker: React.FC<DataSourcePickerProps> = ({ onAddNew, disabled }) => {
  const { dataSources, selectedDataSourceId, setSelectedDataSourceId } = useDataSourcesStore();

  const options: SelectOption[] = [
    ...dataSources.map((ds) => ({
      value: ds.id,
      label: ds.name,
    })),
    {
      value: 'add-new',
      label: '+ Add New Data Source',
      isAddNew: true,
    },
  ];

  const DropdownIndicator = (props: any) => {
    if (disabled) {
      return null;
    }

    return <components.DropdownIndicator {...props} />;
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
      minWidth: 'auto',
      maxWidth: '250px',
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
    menu: () => ({
      minWidth: '200px',
      borderRadius: '1rem',
    }),
    option: (base: any, state: any) => ({
      ...base,
      fontSize: '14px',
      backgroundColor: state.isSelected || state.isFocused ? 'var(--color-depth-2)' : 'transparent',
      color: 'var(--color-primary)',
      '&:hover': {
        color: 'var(--liblab-elements-messages-linkColor)',
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

  return (
    <div className="flex items-center gap-2">
      <BaseSelect
        value={options.find((option) => option.value === selectedDataSourceId)}
        onChange={(option) => {
          if (option?.value === 'add-new') {
            onAddNew?.();
            return;
          }

          setSelectedDataSourceId(option?.value || null);
        }}
        options={options}
        width="auto"
        minWidth="auto"
        isSearchable={false}
        controlIcon={<span className="i-liblab:ic_database text-xl" />}
        isDisabled={disabled}
        components={{ DropdownIndicator }}
        styles={customStyles}
      />
    </div>
  );
};
