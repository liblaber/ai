'use client';

import { classNames } from '~/utils/classNames';

interface ConnectionMethod {
  id: 'oauth' | 'sharable-url';
  title: string;
  subtitle: string;
  icon: string;
}

interface ConnectionMethodSelectorProps {
  methods: ConnectionMethod[];
  selectedMethod: string | null;
  onMethodSelect: (methodId: string) => void;
}

export function ConnectionMethodSelector({ methods, selectedMethod, onMethodSelect }: ConnectionMethodSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-secondary)] mb-4">Select Connection Method</label>
      <div className="flex gap-4">
        {methods.map((method) => (
          <div
            key={method.id}
            onClick={() => onMethodSelect(method.id)}
            className={classNames(
              'cursor-pointer rounded-lg transition-all duration-200',
              selectedMethod === method.id
                ? 'bg-[var(--color-gray-700)] border border-[var(--color-accent)]'
                : 'bg-[var(--color-gray-800)] border border-white/20 hover:bg-[var(--color-gray-700)]',
            )}
            style={{
              width: '50%',
              height: '124px',
              borderRadius: '8px',
              padding: '16px 16px 20px 16px',
            }}
          >
            <div className="flex flex-col items-center text-center h-full">
              <img src={method.icon} alt={method.title} className="mb-2" style={{ width: '40px', height: '40px' }} />
              <h3
                className="text-sm font-normal mb-1 text-[var(--color-gray-100)]"
                style={{
                  fontFamily: 'SF Pro Text, sans-serif',
                  fontSize: '14px',
                  lineHeight: '20px',
                }}
              >
                {method.title}
              </h3>
              <p
                className="text-sm font-normal text-[var(--color-gray-200)]"
                style={{
                  fontFamily: 'SF Pro Text, sans-serif',
                  fontSize: '14px',
                  lineHeight: '20px',
                }}
              >
                {method.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
