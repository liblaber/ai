import React from 'react';
import { Check } from 'lucide-react';
import { classNames } from '~/utils/classNames';

interface CheckboxProps {
  id?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({ id, checked = false, onCheckedChange, disabled = false, className }: CheckboxProps) {
  return (
    <button
      id={id}
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={classNames(
        'w-5 h-5 rounded border-0 flex items-center justify-center transition-colors',
        checked ? 'bg-[#F7F7F8] text-[#08090A]' : 'bg-[#F7F7F8] hover:bg-[#F7F7F8]/90',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
        !disabled ? 'cursor-pointer' : '',
        className,
      )}
    >
      {checked && <Check className="w-3 h-3" />}
    </button>
  );
}
