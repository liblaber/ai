import { forwardRef } from 'react';
import { classNames } from '~/utils/classNames';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={classNames(
        'flex w-full',
        'h-[36px]',
        'rounded-lg',
        'border border-transparent',
        'bg-liblab-elements-bg-depth-4',
        'px-[10px] py-0',
        'text-[0.875rem]',
        'text-[var(--liblab-elements-textPrimary)]',
        'placeholder:text-liblab-elements-textTertiary',
        'focus:border-[var(--liblab-elements-borderColorActive)]',
        'active:border-[var(--liblab-elements-borderColorActive)]',
        'outline-none',
        'font-sans',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      style={{ fontFamily: 'sans-serif', ...(props.style || {}) }}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export { Input };
