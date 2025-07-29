'use client';

import React, { ComponentType } from 'react';
import { ErrorBanner } from '../ui/errorBanner';
import { QueryData } from '@/db/execute-query';

export interface WithErrorHandlingProps<T> {
  queryData?: QueryData<T[]>;
  component: ComponentType<ComponentData<T>>;
  additionalProps?: unknown;
}

type ComponentData<T> = {
  data: T[];
} & Record<string, unknown>;

function extractComponentName<T>(component: ComponentType<ComponentData<T>>) {
  return component.displayName || component.name || 'Anonymous Component';
}

export function WithErrorHandling<T>({ queryData, component: Component, additionalProps }: WithErrorHandlingProps<T>) {
  if (!queryData) {
    return null;
  }

  if (queryData.isError) {
    const componentName = extractComponentName(Component);
    console.error(`Failed to execute query in ${componentName}: ${queryData.errorMessage}`);
    return <ErrorBanner errorMessage={`Error in ${componentName}: ${queryData.errorMessage}`} />;
  }

  if (!queryData.data) {
    const componentName = extractComponentName(Component);
    console.error(`queryData.data not found in WithErrorHandling for component: ${componentName}`);

    return <ErrorBanner errorMessage={`Error in ${componentName}: query data not found`} />;
  }

  return <Component data={queryData.data} {...(additionalProps as object)} />;
}
