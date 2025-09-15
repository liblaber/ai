import { ErrorComponent } from '@/components/building-blocks/error-component/error-component';
import { ComponentType, ReactElement, ReactNode, useMemo, memo, useRef } from 'react';
import { useLocation } from '@remix-run/react';
import { ClientOnly } from '~/components/ui/ClientOnly';

// Global circuit breaker to prevent cascading infinite loops
let globalRenderCount = 0;
let lastResetTime = Date.now();

function resetGlobalCounter() {
  if (Date.now() - lastResetTime > 5000) {
    // Reset every 5 seconds
    globalRenderCount = 0;
    lastResetTime = Date.now();
  }
}

interface WithErrorHandlingProps<T> {
  queryData?: {
    isError: boolean;
    errorMessage?: string;
    data?: T;
  };
  render: (data: T) => ReactNode;
}

const WithErrorHandlingInternal = function WithErrorHandlingInternal<T>({
  queryData,
  render,
}: WithErrorHandlingProps<T>) {
  const location = useLocation();

  // Reset global counter periodically
  resetGlobalCounter();

  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  globalRenderCount += 1;

  // EMERGENCY: Global circuit breaker
  if (globalRenderCount > 10) {
    console.error(`🚨 REMIX GLOBAL INFINITE LOOP DETECTED: ${globalRenderCount} renders`);
    return <div style={{ padding: '16px', backgroundColor: '#fef2f2', color: '#dc2626' }}>🚨 SYSTEM OVERLOAD</div>;
  }

  // EMERGENCY: Per-component circuit breaker (very strict)
  if (renderCountRef.current > 2) {
    console.error(`🚨 REMIX COMPONENT INFINITE LOOP DETECTED: ${renderCountRef.current} renders`);
    return <div style={{ padding: '16px', backgroundColor: '#fef2f2', color: '#dc2626' }}>🚨 LOOP BLOCKED</div>;
  }

  // Early return for null/undefined queryData
  if (!queryData) {
    return null;
  }

  // Handle error state
  if (queryData.isError) {
    // Use simple div instead of ErrorComponent to prevent infinite loops
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

  // Handle missing data
  if (!queryData.data || !Array.isArray(queryData.data)) {
    return null;
  }

  // EMERGENCY: Minimal data processing
  const safeData = queryData.data || [];

  // Render with processed data
  try {
    return render(safeData);
  } catch (error) {
    return (
      <div style={{ padding: '16px', backgroundColor: '#fef2f2', color: '#dc2626' }}>⚠️ Component render failed</div>
    );
  }
};

function extractComponentName<T>(render: (data: T) => ReactNode) {
  try {
    const tempElement = render({} as T);
    const element = tempElement as ReactElement;
    const componentType = element?.type as ComponentType<any>;

    return componentType?.name || componentType?.displayName || 'Anonymous Component';
  } catch {
    return 'Anonymous Component';
  }
}

export function WithErrorHandling<T>(props: WithErrorHandlingProps<T>) {
  return <ClientOnly fallback={<></>}>{() => <WithErrorHandlingInternal {...props} />}</ClientOnly>;
}
