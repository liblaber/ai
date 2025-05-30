import React from 'react';
import type { ControlProps, OptionProps, StylesConfig } from 'react-select';
import Select, { components } from 'react-select';

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

interface ControlWithIconProps extends ControlProps<SelectOption> {
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
            color: 'var(--liblab-elements-textSecondary)',
          }}
        >
          {controlIcon}
        </div>
      )}
      {children}
    </components.Control>
  );
};

interface SelectProps {
  value?: SelectOption | null;
  onChange?: (option: SelectOption | null) => void;
  options: SelectOption[];
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
  styles?: Partial<StylesConfig<SelectOption, false>>;
  controlIcon?: React.ReactNode;
}

const defaultStyles: StylesConfig<SelectOption, false> = {
  control: (base) => ({
    ...base,
    minWidth: '300px',
    backgroundColor: 'var(--liblab-elements-bg-depth-4)', // gray-700
    border: '1px solid transparent',
    boxShadow: 'none',
    outline: 'none !important',
    borderRadius: '0.5rem', // rounded-xl
    minHeight: '36px',
    height: '36px',
    fontSize: '0.875rem', // text-sm
    color: 'var(--liblab-elements-textPrimary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    fontFamily: 'sans-serif',
    '&:hover': {
      border: '1px solid inherit',
    },
    '&:active': {
      outline: 'none',
      border: '1px solid var(--liblab-elements-borderColorActive)',
    },
    '&:focus-visible': {
      border: '1px solid var(--liblab-elements-borderColorActive)',
    },
    '&:focus': {
      border: '1px solid var(--liblab-elements-borderColorActive)',
    },
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'var(--liblab-elements-bg-depth-2) !important',
    boxShadow: '0 4px 6px 2px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    marginTop: '0.25rem',
    cursor: 'pointer',
    border: '2px solid var(--liblab-elements-borderColor)',
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
      ? 'var(--liblab-elements-bg-depth-2)'
      : state.isFocused
        ? 'var(--liblab-elements-bg-depth-3)'
        : 'transparent',
    color: 'var(--liblab-elements-textPrimary)',
    fontSize: '0.875rem',
    '&:hover': {
      color: 'var(--liblab-elements-messages-linkColor)',
    },
    '&:active': {
      backgroundColor: 'var(--liblab-elements-bg-depth-2)',
    },
    padding: '5px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    fontFamily: 'sans-serif',
  }),
  singleValue: (base) => ({
    ...base,
    color: 'var(--liblab-elements-textPrimary)',
    fontSize: '0.875rem',
  }),
  valueContainer: (base) => ({
    ...base,
    padding: '0 8px',
  }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--liblab-elements-textTertiary)',
    fontSize: '0.875rem',
    fontFamily: 'sans-serif',
  }),
  indicatorSeparator: (base) => ({
    ...base,
    display: 'none',
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: 'var(--liblab-elements-textSecondary)',
    '&:hover': {
      color: 'var(--liblab-elements-textPrimary)',
    },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: 'var(--liblab-elements-textSecondary)',
    '&:hover': {
      color: 'var(--liblab-elements-textPrimary)',
    },
  }),
  input: (base) => ({
    ...base,
    color: 'var(--liblab-elements-textPrimary)',
    fontSize: '0.875rem',
    fontFamily: 'sans-serif',
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: 'var(--liblab-elements-bg-depth-2)',
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: 'var(--liblab-elements-textPrimary)',
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: 'var(--liblab-elements-textSecondary)',
    '&:hover': {
      backgroundColor: 'var(--liblab-elements-bg-depth-3)',
      color: 'var(--liblab-elements-textPrimary)',
    },
  }),
};

export const BaseSelect: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  isSearchable = false,
  isClearable = false,
  isDisabled = false,
  className = '',
  width = '200px',
  minWidth,
  menuPlacement = 'auto',
  menuPosition = 'absolute',
  components: customComponents,
  styles: customStyles,
  controlIcon,
}) => {
  const mergedStyles = {
    ...defaultStyles,
    ...customStyles,
    control: (base: any, state: any) => ({
      ...defaultStyles.control?.(base, state),
      ...customStyles?.control?.(base, state),
      minWidth,
      width,
    }),
    menu: (base: any, state: any) => ({
      ...defaultStyles.menu?.(base, state),
      ...customStyles?.menu?.(base, state),
    }),
    menuList: (base: any, state: any) => ({
      ...defaultStyles.menuList?.(base, state),
      ...customStyles?.menuList?.(base, state),
    }),
  };

  const mergedComponents = {
    Control: (props: ControlWithIconProps) => <Control {...props} controlIcon={controlIcon} />,
    Option,
    ...customComponents,
  };

  return (
    <Select
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      isSearchable={isSearchable}
      isClearable={isClearable}
      isDisabled={isDisabled}
      className={className}
      classNamePrefix="baseSelect"
      menuPlacement={menuPlacement}
      menuPosition={menuPosition}
      components={mergedComponents}
      styles={mergedStyles}
    />
  );
};
