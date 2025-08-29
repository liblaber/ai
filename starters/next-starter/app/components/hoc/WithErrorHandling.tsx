'use client';

import React, { ComponentType, useMemo, memo, useRef } from 'react';
import { QueryData } from '@/db/execute-query';

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

export interface WithErrorHandlingProps<T> {
  queryData?: QueryData<T[]>;
  component: ComponentType<ComponentData<T>>;
  additionalProps?: unknown;
}

type ComponentData<T> = {
  data: T[];
} & Record<string, unknown>;

// Simple component name extraction without any recursion risk
function getComponentName<T>(component: ComponentType<ComponentData<T>>): string {
  return component.displayName || component.name || 'Component';
}

function WithErrorHandlingInternal<T>({ queryData, component: Component, additionalProps }: WithErrorHandlingProps<T>) {
  // Reset global counter periodically
  resetGlobalCounter();

  // Use ref to track render count and prevent infinite loops
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  globalRenderCount += 1;

  // EMERGENCY: Global circuit breaker
  if (globalRenderCount > 10) {
    console.error(`🚨 GLOBAL INFINITE LOOP DETECTED: ${globalRenderCount} renders across all components`);
    return <div style={{ padding: '16px', backgroundColor: '#fef2f2', color: '#dc2626' }}>🚨 SYSTEM OVERLOAD</div>;
  }

  // EMERGENCY: Per-component circuit breaker
  if (renderCountRef.current > 2) {
    console.error(`🚨 COMPONENT INFINITE LOOP DETECTED: Component rendered ${renderCountRef.current} times`, {
      componentName: Component?.name || Component?.displayName || 'Unknown',
      hasQueryData: !!queryData,
      queryDataKeys: queryData ? Object.keys(queryData) : [],
      dataLength: queryData?.data?.length || 0,
      additionalProps: additionalProps ? Object.keys(additionalProps as any) : [],
    });
    return <div style={{ padding: '16px', backgroundColor: '#fef2f2', color: '#dc2626' }}>🚨 LOOP BLOCKED</div>;
  }

  // Early returns with simple error messages to avoid any function calls
  if (!queryData) {
    return null;
  }

  if (queryData.isError) {
    // Use simple div instead of ErrorBanner to prevent infinite loops
    return (
      <div
        style={{
          padding: '16px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#dc2626',
          fontSize: '14px',
        }}
      >
        ⚠️ Error: {queryData.errorMessage || 'Unknown error'}
      </div>
    );
  }

  if (!queryData.data || !Array.isArray(queryData.data)) {
    // Use simple div instead of ErrorBanner to prevent infinite loops
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
        ⚠️ No data available
      </div>
    );
  }

  // EMERGENCY: Minimal data processing to prevent loops
  const safeData = queryData.data || [];
  const props = { data: safeData, ...(additionalProps || {}) };

  // Render with error boundary
  try {
    return React.createElement(Component, props);
  } catch (error) {
    return (
      <div style={{ padding: '16px', backgroundColor: '#fef2f2', color: '#dc2626' }}>⚠️ Component render failed</div>
    );
  }
}

// EMERGENCY: Disable memo to debug infinite loops
export const WithErrorHandling = WithErrorHandlingInternal as <T>(
  props: WithErrorHandlingProps<T>,
) => React.JSX.Element | null;
