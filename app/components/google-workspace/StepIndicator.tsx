'use client';

import { classNames } from '~/utils/classNames';

interface Step {
  label: string;
  completed: boolean;
}

interface StepIndicatorProps {
  currentStep: number;
  steps: Step[];
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="flex items-center mb-8">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = step.completed;

        return (
          <div key={index} className="flex items-center">
            <div
              className={classNames(
                'flex items-center justify-center rounded-full text-center',
                isActive
                  ? 'bg-[var(--color-accent)] text-[var(--color-gray-900)]'
                  : 'bg-[var(--color-gray-600)] text-[var(--color-gray-300)]',
              )}
              style={{
                width: '24px',
                height: '24px',
                fontFamily: 'Roboto, sans-serif',
                fontSize: '12px',
                fontWeight: 400,
              }}
            >
              {isCompleted ? (
                <img src="/icons/check-circle.svg" alt="Completed" style={{ width: '12px', height: '10px' }} />
              ) : (
                index + 1
              )}
            </div>

            <span
              className={classNames('ml-2', isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-gray-300)]')}
              style={{
                fontFamily: 'Roboto, sans-serif',
                fontSize: '14px',
                fontWeight: 400,
                lineHeight: '143%',
                letterSpacing: '0.15px',
              }}
            >
              {step.label}
            </span>

            {index < steps.length - 1 && (
              <div
                className="border-t border-[var(--color-gray-300)] mx-2"
                style={{
                  width: '11.25px',
                  borderWidth: '1px',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
