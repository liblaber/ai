import { Outlet, useRouteError } from '@remix-run/react';
import { useEffect, useRef } from 'react';

import './tailwind.css';
import { ErrorComponent } from '@/components/building-blocks/error-component/error-component';
import { Layout } from '@/components/layout/layout';

export { links } from '@/components/layout/layout';

export function ErrorBoundary() {
  const error: Error = useRouteError() as Error;
  const loggedErrors = useRef<string[]>([]);

  useEffect(() => {
    if (import.meta.env.VITE_PROD || !error?.stack || loggedErrors.current.includes(error.stack)) {
      return;
    }

    console.error(error?.stack);
    loggedErrors.current.push(error.stack);
  }, [error]);

  if (import.meta.env.VITE_PROD) {
    return <ErrorComponent errorMessage="Something went wrong, please try to refresh the page." />;
  }

  return <pre>{error?.stack}</pre>;
}

export default function App() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
