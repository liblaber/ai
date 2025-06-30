'use client';
import React from 'react';

export function ErrorBanner({ errorMessage }: { errorMessage: string }) {
  return (
    <div
      style={{
        background: '#fee2e2',
        color: '#b91c1c',
        border: '1px solid #fca5a5',
        borderRadius: 8,
        padding: '1rem',
        margin: '1rem 0',
        fontWeight: 500,
        fontFamily: 'inherit',
        fontSize: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}
    >
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#b91c1c" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10" stroke="#b91c1c" strokeWidth="2" fill="#fee2e2" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01" />
      </svg>
      <span>{errorMessage}</span>
    </div>
  );
}
