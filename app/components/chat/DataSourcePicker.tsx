import React from 'react';
import { useDataSourcesStore } from '~/lib/stores/dataSources';
import type { SelectOption } from '~/components/ui/Select';
import { BaseSelect } from '~/components/ui/Select';
import { components } from 'react-select';
import IcDatabase from '~/icons/ic_database.svg';

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
    menu: (base: any) => ({
      ...base,
      minWidth: '200px',
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
        controlIcon={<IcDatabase className="text-xl" />}
        isDisabled={disabled}
        components={{ DropdownIndicator }}
        styles={customStyles}
        menuPlacement="bottom"
      />
    </div>
  );
};
