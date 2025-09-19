import { type FC, useEffect, useState } from 'react';
import { useEnvironmentDataSourcesStore } from '~/lib/stores/environmentDataSources';
import type { GroupBase, SelectOption as BaseSelectOption } from '~/components/ui/Select';
import { BaseSelect } from '~/components/ui/Select';
import { components, type OptionsOrGroups } from 'react-select';
import { Check, ChevronDown, CirclePlus, Settings } from 'lucide-react';
import IcDatabase from '~/icons/ic_database.svg';
import { DATA_SOURCE_ICON_MAP } from '~/styles/data-source-icons';

interface SelectOption extends BaseSelectOption {
  environmentName?: string;
  dataSourceName?: string;
}

interface DataSourcePickerProps {
  onAddNew?: () => void;
  onManageEnvironments?: (dataSourceId: string) => void;
  disabled?: boolean;
  placement?: 'top' | 'bottom';
  onDataSourceChange?: (
    dataSourceId: string,
    environmentId: string,
    dataSourceName: string,
    environmentName: string,
  ) => void;
}

export const DataSourcePicker: FC<DataSourcePickerProps> = ({
  onAddNew,
  onManageEnvironments,
  disabled,
  onDataSourceChange,
  placement = 'bottom',
}) => {
  const { dataSources, selectedEnvironmentDataSource, setSelectedEnvironmentDataSource } =
    useEnvironmentDataSourcesStore();
  const [openGroupIds, setOpenGroupIds] = useState<string[]>([]);

  useEffect(() => {
    if (selectedEnvironmentDataSource.dataSourceId) {
      const selectedDataSource = dataSources.find((ds) => ds.id === selectedEnvironmentDataSource.dataSourceId);

      if (selectedDataSource && !openGroupIds.includes(selectedDataSource.name)) {
        setOpenGroupIds((prev) => [...prev, selectedDataSource.name]);
      }
    }
  }, [dataSources, selectedEnvironmentDataSource.dataSourceId]);

  const options: OptionsOrGroups<SelectOption, GroupBase<SelectOption>> = [
    {
      value: 'add-new',
      label: 'Connect new data source',
      isAddNew: true,
      icon: <CirclePlus size={16} fill="var(--color-tertiary)" color="var(--color-depth-3)" />,
    },
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
          icon: DATA_SOURCE_ICON_MAP[ds.type] || <IcDatabase />,
          options: [
            ...ds.environments.map((env) => ({
              value: `${ds.id}:${env.id}`,
              label: env.name,
              dataSourceName: ds.name,
            })),
            {
              value: `manage-environment:${ds.id}`,
              label: 'Manage environments',
              isAddNew: true,
              icon: <Settings size={16} fill="var(--color-tertiary)" color="var(--color-depth-3)" />,
            },
          ],
        }))),
  ];

  const handleDataSourceChange = async (option: SelectOption | null) => {
    if (option?.value === 'add-new') {
      onAddNew?.();
      return;
    }

    if (option?.value?.startsWith('manage-environment')) {
      const dataSourceId = option.value.split(':')[1];
      onManageEnvironments?.(dataSourceId);

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

  const Menu = (props: any) => {
    return (
      <components.Menu {...props}>
        <div className="flex flex-col p-2 text-primary">
          {options.map((option) => {
            if (isGroupOption(option)) {
              const isSelectedGroup = openGroupIds.includes(option.label);
              return (
                <div key={option.label}>
                  <div
                    className="flex items-center justify-between w-full p-2 cursor-pointer hover:bg-depth-3 rounded-md"
                    onClick={() =>
                      setOpenGroupIds((prev) =>
                        prev.includes(option.label)
                          ? (prev.filter((id) => id !== option.label) as string[])
                          : ([...prev, option.label] as string[]),
                      )
                    }
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <ChevronDown
                        className={`transition-transform ${isSelectedGroup ? 'rotate-0' : '-rotate-90'}`}
                        size={16}
                      />
                      {option.icon}
                      <span>{option.label}</span>
                    </div>
                  </div>
                  {isSelectedGroup && (
                    <div className="pl-6">
                      {option.options.map((envOption: SelectOption) => (
                        <div
                          key={envOption.value}
                          className="flex items-center justify-between w-full p-2 cursor-pointer hover:bg-depth-3 rounded-md text-sm"
                          onClick={() => {
                            props.selectOption(envOption);
                          }}
                        >
                          <div className="flex gap-2 items-center font-light">
                            {envOption.icon || <></>}
                            <span>{envOption.label}</span>
                          </div>
                          {selectedEnvironmentDataSource.dataSourceId &&
                            selectedEnvironmentDataSource.environmentId &&
                            `${selectedEnvironmentDataSource.dataSourceId}:${selectedEnvironmentDataSource.environmentId}` ===
                              envOption.value && <Check size={16} />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            } else {
              return (
                <div
                  key={option.value}
                  className="flex items-center gap-2 w-full p-2 cursor-pointer hover:bg-depth-3 rounded-md text-sm"
                  onClick={() => {
                    props.selectOption(option as SelectOption);
                  }}
                >
                  {option.icon || <></>}
                  <span>{option.label}</span>
                </div>
              );
            }
          })}
        </div>
      </components.Menu>
    );
  };

  const DropdownIndicator = (props: any) => {
    if (disabled) {
      return null;
    }

    return <components.DropdownIndicator {...props} />;
  };

  const Option = () => {
    return null; // Using custom Menu, so Option is not needed
  };

  const SingleValue = (props: any) => {
    const selectedEnvironment = dataSources
      .flatMap((ds) => ds.environments.map((env) => ({ ...env, dataSourceName: ds.name, dataSourceId: ds.id })))
      .find(
        (env) =>
          env.dataSourceId === selectedEnvironmentDataSource.dataSourceId &&
          env.id === selectedEnvironmentDataSource.environmentId,
      );

    return (
      <components.SingleValue {...props}>
        <div className="flex items-center gap-2">
          <span>{selectedEnvironment?.dataSourceName ?? 'Select Data Source'}</span>
          {selectedEnvironment?.name && (
            <span className="text-xs bg-depth-3 text-primary px-2 py-1 rounded-full">{selectedEnvironment.name}</span>
          )}
        </div>
      </components.SingleValue>
    );
  };

  const customStyles = {
    control: (base: any) => ({
      ...base,
      backgroundColor: 'transparent',
      cursor: 'pointer',
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
      justifyContent: 'flex-start',
      flexWrap: 'unset',
      width: 'max-content',
    }),
    valueContainer: (base: any) => ({
      ...base,
      padding: '0',
      flex: 'unset',
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
      minWidth: '280px',
      borderRadius: '0.8rem',
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
    <div className="flex items-center gap-2 mr-5">
      <BaseSelect
        value={findOptionByValue(selectedValue)}
        onChange={handleDataSourceChange}
        options={[]}
        isSearchable={false}
        controlIcon={<IcDatabase className="text-xl" />}
        isDisabled={disabled}
        components={{ DropdownIndicator, Option, SingleValue, Menu }}
        styles={customStyles}
        menuPlacement={placement}
        dataTestId={'data-source-picker-select'}
        placeholder="Select Data Source"
        width="unset"
        minWidth="unset"
      />
    </div>
  );
};

const isGroupOption = (option: SelectOption | GroupBase<SelectOption>): option is GroupBase<SelectOption> => {
  return 'options' in option;
};
