import { type LinksFunction, type LoaderFunctionArgs, redirect } from '@remix-run/cloudflare';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteLoaderData } from '@remix-run/react';
import tailwindReset from '@unocss/reset/tailwind-compat.css?url';
import { stripIndents } from './utils/stripIndent';
import { createHead } from 'remix-island';
import { useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ClientOnly } from 'remix-utils/client-only';
import { env } from './lib/config/env';
import { type DataSource, getDataSources } from '~/lib/services/datasourceService';

import globalStyles from './styles/index.scss?url';
import xtermStyles from '@xterm/xterm/css/xterm.css?url';

import 'virtual:uno.css';
import { useDataSourcesStore } from '~/lib/stores/dataSources';
import { DATA_SOURCE_CONNECTION_ROUTE } from '~/routes/data-source-connection';
import { Toaster } from 'sonner';

declare global {
  interface Window {
    __ENV__: {
      [key: string]: string | undefined;
    };
  }
}

type LoaderData = {
  ENV: Record<string, string | undefined>;
  dataSources: DataSource[];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  let dataSources: DataSource[] = [];

  dataSources = await getDataSources();

  if (!dataSources.length && !request.url.includes(DATA_SOURCE_CONNECTION_ROUTE)) {
    return redirect(DATA_SOURCE_CONNECTION_ROUTE);
  }

  return Response.json({
    dataSources,
    ENV: {
      VITE_BASE_URL: env.VITE_BASE_URL,
    },
  });
};

export const links: LinksFunction = () => [
  {
    rel: 'icon',
    href: '/favicon.svg',
    type: 'image/svg+xml',
  },
  { rel: 'stylesheet', href: tailwindReset },
  { rel: 'stylesheet', href: globalStyles },
  { rel: 'stylesheet', href: xtermStyles },
  {
    rel: 'preconnect',
    href: 'https://fonts.googleapis.com',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap',
  },
];

const inlineThemeCode = stripIndents`
  setLiblabTheme();

  function setLiblabTheme() {
    document.querySelector('html')?.setAttribute('data-theme', 'dark');
  }
`;

export const Head = createHead(() => (
  <>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <Meta />
    <Links />
    <script dangerouslySetInnerHTML={{ __html: inlineThemeCode }} />
  </>
));

export function Layout({ children }: { children: React.ReactNode }) {
  const loaderData = useRouteLoaderData<LoaderData>('root');

  const { setDataSources } = useDataSourcesStore();

  useEffect(() => {
    if (loaderData?.dataSources) {
      setDataSources(loaderData?.dataSources);
    }
  }, [loaderData?.dataSources]);

  useEffect(() => {
    if (loaderData && loaderData.ENV) {
      window.__ENV__ = loaderData.ENV;
    }
  }, [loaderData]);

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `window.__ENV__ = ${JSON.stringify(loaderData?.ENV || {})}`,
        }}
      />
      <ClientOnly>{() => <DndProvider backend={HTML5Backend}>{children}</DndProvider>}</ClientOnly>
      <Toaster richColors />
      <ScrollRestoration />
      <Scripts />
    </>
  );
}

export default function App() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
