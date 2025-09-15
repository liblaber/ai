'use client';

import { classNames } from '~/utils/classNames';

interface NavigationButtonsProps {
  onBack?: () => void;
  onNext?: () => void;
  backLabel?: string;
  nextLabel?: string;
  nextDisabled?: boolean;
  isSubmitting?: boolean;
}

export function NavigationButtons({
  onBack,
  onNext,
  backLabel = 'Previous',
  nextLabel = 'Next',
  nextDisabled = false,
  isSubmitting = false,
}: NavigationButtonsProps) {
  return (
    <div
      className="flex items-center justify-end gap-4 mt-8 pt-6"
      style={{
        borderTop: '1px solid var(--color-gray-600)',
      }}
    >
      {onBack && (
        <button
          onClick={onBack}
          className="cursor-pointer transition-colors hover:bg-[var(--color-gray-700)] border border-[var(--color-gray-600)] rounded-lg"
          style={{
            width: '83px',
            height: '36px',
            padding: '8px 12px',
            fontFamily: 'SF Pro Text, sans-serif',
            fontSize: '14px',
            color: 'var(--color-gray-300)',
          }}
        >
          {backLabel}
        </button>
      )}

      {onNext && (
        <button
          onClick={onNext}
          disabled={nextDisabled || isSubmitting}
          className={classNames(
            'transition-all duration-200 text-sm font-medium rounded-lg',
            !nextDisabled && !isSubmitting
              ? 'bg-[var(--color-accent)] text-gray-900 hover:bg-[var(--color-accent-600)] cursor-pointer'
              : 'bg-[#474B4F] text-[var(--color-gray-400)] cursor-not-allowed',
          )}
          style={{
            height: '36px',
            padding: '8px 12px',
          }}
        >
          {isSubmitting ? 'Processing...' : nextLabel}
        </button>
      )}
    </div>
  );
}
