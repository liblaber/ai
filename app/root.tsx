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
import { AuthProvider } from './components/auth/AuthContext';
import { getSession } from './auth/session';
import { type UserProfile, userService } from '~/lib/services/userService';
import PluginManager from '~/lib/plugins/plugin-manager';
import { usePluginStore } from '~/lib/plugins/plugin-store';
import { type DataSourceType, useDataSourceTypesStore } from '~/lib/stores/dataSourceTypes';
import { DataSourcePluginManager } from '~/lib/plugins/data-access/data-access-plugin-manager';
import type { PluginAccessMap } from '~/lib/plugins/types';
import { useUserStore } from './lib/stores/user';

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
  user: UserProfile | null;
  pluginAccess: PluginAccessMap;
  dataSourceTypes: DataSourceType[];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const session = await getSession(request);
  let user: UserProfile | null = null;
  let dataSources: DataSource[] = [];

  if (session?.user) {
    user = await userService.getUser(session.user.id);
    dataSources = await getDataSources(session.user.id);

    if (!dataSources.length && !request.url.includes(DATA_SOURCE_CONNECTION_ROUTE)) {
      return redirect(DATA_SOURCE_CONNECTION_ROUTE);
    }
  }

  await PluginManager.getInstance().initialize();

  const pluginAccess = PluginManager.getInstance().getAccessMap();

  const dataSourceTypes = DataSourcePluginManager.getAvailableDatabaseTypes();

  return Response.json({
    user,
    dataSources,
    pluginAccess,
    dataSourceTypes,
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
  const { setPluginAccess } = usePluginStore();
  const { setDataSourceTypes } = useDataSourceTypesStore();
  const { setUser } = useUserStore();

  useEffect(() => {
    if (loaderData?.dataSources) {
      setDataSources(loaderData?.dataSources);
    }
  }, [loaderData?.dataSources]);

  useEffect(() => {
    if (loaderData?.pluginAccess) {
      setPluginAccess(loaderData?.pluginAccess);
    }
  }, [loaderData?.pluginAccess]);

  useEffect(() => {
    if (loaderData?.dataSourceTypes) {
      setDataSourceTypes(loaderData?.dataSourceTypes);
    }
  }, [loaderData?.dataSourceTypes]);

  useEffect(() => {
    if (loaderData?.user) {
      setUser(loaderData?.user);
    }
  }, [loaderData?.user]);

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
    <AuthProvider>
      <Layout>
        <Outlet />
      </Layout>
    </AuthProvider>
  );
}
