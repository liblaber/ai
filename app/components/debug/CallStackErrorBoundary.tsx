'use client';

import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  componentName: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class CallStackErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Log the specific component that caused the error
    if (error.message.includes('Maximum call stack size exceeded')) {
      console.error(`🚨 CALL STACK OVERFLOW in component:`, {
        componentName: 'Unknown (will be set in componentDidCatch)',
        error: error.message,
        stack: error.stack?.split('\n').slice(0, 10), // First 10 lines of stack trace
      });
    }

    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (error.message.includes('Maximum call stack size exceeded')) {
      console.error(`🚨 CALL STACK OVERFLOW DETAILS:`, {
        componentName: this.props.componentName,
        error: error.message,
        errorInfo,
        componentStack: errorInfo.componentStack,
        props: this.props,
        timestamp: new Date().toISOString(),
        memoryUsage: typeof performance !== 'undefined' ? (performance as any).memory : 'Not available',
      });

      // Try to identify the specific component causing the issue
      const componentStackLines = errorInfo.componentStack?.split('\n') || [];
      const suspiciousComponents = componentStackLines
        .filter((line) => line.trim() && !line.includes('ErrorBoundary'))
        .slice(0, 5); // Get the first 5 components in the stack

      console.error(`🔍 SUSPICIOUS COMPONENTS (likely causing recursion):`, suspiciousComponents);

      // Look for data processing patterns in the stack
      const dataProcessingComponents = componentStackLines.filter(
        (line) =>
          line.includes('map') ||
          line.includes('Artifact') ||
          line.includes('ActionList') ||
          line.includes('Message') ||
          line.includes('Table') ||
          line.includes('Data'),
      );

      if (dataProcessingComponents.length > 0) {
        console.error(`🔍 DATA PROCESSING COMPONENTS DETECTED:`, dataProcessingComponents);
      }

      // Log current render count if available
      if (typeof window !== 'undefined') {
        (window as any).__renderCount = ((window as any).__renderCount || 0) + 1;
        console.error(`🔢 TOTAL RENDERS THIS SESSION: ${(window as any).__renderCount}`);
      }
    }
  }

  render() {
    if (this.state.hasError && this.state.error?.message.includes('Maximum call stack size exceeded')) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-red-800 font-semibold mb-2">
            ⚠️ Error: Maximum call stack size exceeded in {this.props.componentName}
          </h3>
          <p className="text-red-700 text-sm">
            A React component is causing infinite recursion. Check the browser console for detailed debugging
            information.
          </p>
          <details className="mt-2">
            <summary className="text-red-600 cursor-pointer text-xs">Error Details</summary>
            <pre className="text-xs bg-red-100 p-2 rounded mt-1 overflow-auto max-h-32">{this.state.error.stack}</pre>
          </details>
        </div>
      );
    }

    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-red-800 font-semibold mb-2">⚠️ Error: An error occurred in {this.props.componentName}</h3>
          <p className="text-red-700 text-sm">{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default CallStackErrorBoundary;
