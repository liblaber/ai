import { Outlet, useRouteError } from '@remix-run/react';
import { useEffect, useRef } from 'react';

import './tailwind.css';
import { ErrorComponent } from '@/components/building-blocks/error-component/error-component';
import { Layout } from '@/components/layout/layout';

export { links } from '@/components/layout/layout';

/*
 * This is a route-level error boundary used by Remix automatically.
 * It handles rendering and loader/action errors for this route (or root app if in root.tsx).
 * Although not used manually in JSX, Remix uses this export behind the scenes.
 */
export function ErrorBoundary() {
  const error: Error = useRouteError() as Error;
  const loggedErrors = useRef<string[]>([]);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_PROD || !error?.stack || loggedErrors.current.includes(error.stack)) {
      return;
    }

    console.error(error?.stack);
    loggedErrors.current.push(error.stack);
  }, [error]);

  if (process.env.NEXT_PUBLIC_PROD) {
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
