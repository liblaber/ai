import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { classNames } from '~/utils/classNames';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-depth-2 disabled:pointer-events-none disabled:opacity-50 font-medium',
  {
    variants: {
      variant: {
        default: 'text-primary hover:bg-depth-3',
        destructive: 'bg-red-500 text-white hover:bg-red-600',
        outline: 'border border-input bg-transparent hover:bg-depth-3 text-primary border-depth-3',
        primary: 'bg-accent-500 text-gray-900 text-sm hover:bg-accent-600',
        secondary: 'bg-depth-1 text-primary hover:bg-depth-3 hover:text-[var(--color-accent)]',
        ghost: 'bg-transparent hover:text-primary',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  _asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, _asChild = false, ...props }, ref) => {
    return <button className={classNames(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
