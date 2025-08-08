'use client';

import React from 'react';
import type { ControlProps, OptionProps, StylesConfig } from 'react-select';
import Select, { components } from 'react-select';
import { ClientOnly } from '~/components/ui/ClientOnly';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  [key: string]: any;
}

const Option = ({ children, ...props }: OptionProps<SelectOption>) => {
  const { data } = props;
  return (
    <components.Option {...props}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {data.icon && <span style={{ display: 'flex', alignItems: 'center' }}>{data.icon}</span>}
        <span>{children}</span>
      </div>
    </components.Option>
  );
};

interface ControlWithIconProps extends ControlProps<any> {
  controlIcon?: React.ReactNode;
}

const Control = ({ children, controlIcon, ...props }: ControlWithIconProps) => {
  return (
    <components.Control {...props}>
      {controlIcon && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            paddingLeft: '10px',
            color: 'var(--color-secondary)',
          }}
        >
          {controlIcon}
        </div>
      )}
      {children}
    </components.Control>
  );
};

interface SelectProps<T extends SelectOption = SelectOption> {
  value?: T | null;
  onChange?: (option: T | null) => void;
  options: readonly T[];
  placeholder?: string;
  isSearchable?: boolean;
  isClearable?: boolean;
  isDisabled?: boolean;
  className?: string;
  width?: string;
  minWidth?: string;
  menuPlacement?: 'auto' | 'bottom' | 'top';
  menuPosition?: 'absolute' | 'fixed';
  components?: any;
  styles?: Partial<StylesConfig<T, false>>;
  controlIcon?: React.ReactNode;
}

const createDefaultStyles = <T extends SelectOption>(): StylesConfig<T, false> => ({
  control: (base) => ({
    ...base,
    minWidth: '300px',
    backgroundColor: 'var(--color-depth-4)', // gray-700
    border: '1px solid transparent',
    boxShadow: 'none',
    outline: 'none !important',
    borderRadius: '0.5rem', // rounded-xl
    minHeight: '36px',
    height: '36px',
    fontSize: '0.875rem', // text-sm
    color: 'var(--color-primary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    fontFamily: 'sans-serif',
    '&:hover': {
      border: '1px solid inherit',
    },
    '&:active': {
      outline: 'none',
      border: '1px solid var(--color-accent)',
    },
    '&:focus-visible': {
      border: '1px solid var(--color-accent)',
    },
    '&:focus': {
      border: '1px solid var(--color-accent)',
    },
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'var(--color-depth-2) !important',
    boxShadow: '0 4px 6px 2px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    marginTop: '0.25rem',
    cursor: 'pointer',
    border: '2px solid var(--color-depth-2)',
    borderRadius: '0.5rem',
    zIndex: 9999,
    textAlign: 'initial',
  }),
  menuList: (base) => ({
    ...base,
    padding: '0.25rem',
    backgroundColor: 'transparent !important',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? 'var(--color-depth-2)'
      : state.isFocused
        ? 'var(--color-depth-3)'
        : 'transparent',
    color: 'var(--color-primary)',
    fontSize: '0.875rem',
    '&:hover': {
      color: 'var(--color-link)',
    },
    '&:active': {
      backgroundColor: 'var(--color-depth-2)',
    },
    padding: '5px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    fontFamily: 'sans-serif',
  }),
  singleValue: (base) => ({
    ...base,
    color: 'var(--color-primary)',
    fontSize: '0.875rem',
  }),
  valueContainer: (base) => ({
    ...base,
    padding: '0 8px',
  }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--color-tertiary)',
    fontSize: '0.875rem',
    fontFamily: 'sans-serif',
  }),
  indicatorSeparator: (base) => ({
    ...base,
    display: 'none',
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: 'var(--color-secondary)',
    '&:hover': {
      color: 'var(--color-primary)',
    },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: 'var(--color-secondary)',
    '&:hover': {
      color: 'var(--color-primary)',
    },
  }),
  input: (base) => ({
    ...base,
    color: 'var(--color-primary)',
    fontSize: '0.875rem',
    fontFamily: 'sans-serif',
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: 'var(--color-depth-2)',
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: 'var(--color-primary)',
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: 'var(--color-secondary)',
    '&:hover': {
      backgroundColor: 'var(--color-depth-3)',
      color: 'var(--color-primary)',
    },
  }),
});

export const BaseSelect = <T extends SelectOption = SelectOption>({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  isSearchable = false,
  isClearable = false,
  isDisabled = false,
  className = '',
  width = '200px',
  minWidth = '200px',
  menuPlacement = 'auto',
  menuPosition = 'absolute',
  components: customComponents,
  styles: customStyles,
  controlIcon,
}: SelectProps<T>) => {
  const defaultStyles = createDefaultStyles<T>();
  const mergedStyles = { ...defaultStyles, ...customStyles };

  const defaultComponents = {
    Option,
    ...(controlIcon && { Control: (props: any) => <Control {...props} controlIcon={controlIcon} /> }),
    ...customComponents,
  };

  return (
    <ClientOnly>
      <div style={{ width, minWidth }}>
        <Select<T>
          value={value}
          onChange={onChange}
          options={options}
          placeholder={placeholder}
          isSearchable={isSearchable}
          isClearable={isClearable}
          isDisabled={isDisabled}
          className={className}
          styles={mergedStyles}
          components={defaultComponents}
          menuPlacement={menuPlacement}
          menuPosition={menuPosition}
        />
      </div>
    </ClientOnly>
  );
};
