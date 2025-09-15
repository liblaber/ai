import type { ReactNode } from 'react';

interface WithErrorHandlingProps<T> {
  queryData?: {
    isError: boolean;
    errorMessage?: string;
    data?: T;
  };
  render: (data: T) => ReactNode;
}

function WithErrorHandlingInternal<T>({ queryData, render }: WithErrorHandlingProps<T>) {
  if (!queryData) {
    return null;
  }

  if (queryData.isError) {
    return (
      <div
        style={{
          padding: '16px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#dc2626',
        }}
      >
        ⚠️ Error: {queryData.errorMessage || 'Unknown error'}
      </div>
    );
  }

  if (!queryData.data || !Array.isArray(queryData.data)) {
    return null;
  }

  const safeData = queryData.data || [];

  try {
    return render(safeData);
  } catch {
    return (
      <div style={{ padding: '16px', backgroundColor: '#fef2f2', color: '#dc2626' }}>⚠️ Component render failed</div>
    );
  }
}

export function WithErrorHandling<T>(props: WithErrorHandlingProps<T>) {
  return <WithErrorHandlingInternal {...props} />;
}
