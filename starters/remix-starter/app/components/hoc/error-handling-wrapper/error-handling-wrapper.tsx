import { ErrorComponent } from '@/components/building-blocks/error-component/error-component';
import { ComponentType, ReactElement, ReactNode } from 'react';
import { useLocation } from '@remix-run/react';
import { ClientOnly } from 'remix-utils/client-only';

interface WithErrorHandlingProps<T> {
  queryData?: {
    isError: boolean;
    errorMessage?: string;
    data?: T;
  };
  render: (data: T) => ReactNode;
}

function WithErrorHandlingInternal<T>({ queryData, render }: WithErrorHandlingProps<T>) {
  const location = useLocation();

  if (!queryData) {
    return null;
  }

  if (queryData.isError) {
    const componentName = extractComponentName(render);

    console.error(`Failed to execute query in ${componentName ?? location.pathname}: ${queryData.errorMessage}`);

    return (
      <ErrorComponent errorMessage={`Error in ${componentName ?? location.pathname}: ${queryData.errorMessage}`} />
    );
  }

  if (!queryData.data) {
    return null;
  }

  return render(queryData.data);
}

function extractComponentName<T>(render: (data: T) => ReactNode) {
  try {
    const tempElement = render({} as T);
    const element = tempElement as ReactElement;
    const componentType = element?.type as ComponentType<any>;

    return componentType.name || componentType.displayName || 'Anonymous Component';
  } catch (error) {
    console.warn('Could not extract component name from render callback function', error);
  }
}

export function WithErrorHandling<T>(props: WithErrorHandlingProps<T>) {
  return <ClientOnly fallback={<></>}>{() => <WithErrorHandlingInternal {...props} />}</ClientOnly>;
}
