import { useStore } from '@nanostores/react';
import { json, type LinksFunction, type LoaderFunctionArgs, redirect } from '@remix-run/cloudflare';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteLoaderData } from '@remix-run/react';
import tailwindReset from '@unocss/reset/tailwind-compat.css?url';
import { themeStore } from './lib/stores/theme';
import { stripIndents } from './utils/stripIndent';
import { createHead } from 'remix-island';
import { useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ClientOnly } from 'remix-utils/client-only';
import { AuthProvider } from '~/contexts/AuthContext';
import { env } from './lib/config/env';
import { type DataSource, getDataSources } from '~/lib/services/datasourceService';

import globalStyles from './styles/index.scss?url';
import xtermStyles from '@xterm/xterm/css/xterm.css?url';

import 'virtual:uno.css';
import { auth } from '~/lib/auth';
import { userService } from '~/lib/services/userService';
import { useCreditsStore } from '~/lib/stores/credits';
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
  credits: { usedCredits: number; maxCreditsPerDay: number };
  dataSources: DataSource[];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const session = await auth.api.getSession({ headers: request.headers });
  let credits = { usedCredits: 0, maxCreditsPerDay: 0 };
  let dataSources: DataSource[] = [];

  if (session?.user) {
    const userCredits = await userService.getUserCredits(session.user.id);
    credits = {
      usedCredits: userCredits,
      maxCreditsPerDay: Number(env.MAX_CREDITS_PER_DAY),
    };

    dataSources = await getDataSources(session.user.id);

    if (!dataSources.length && !request.url.includes(DATA_SOURCE_CONNECTION_ROUTE)) {
      return redirect(DATA_SOURCE_CONNECTION_ROUTE);
    }
  }

  return json({
    credits,
    dataSources,
    ENV: {
      VITE_BASE_URL: env.VITE_BASE_URL,
      VITE_PUBLIC_POSTHOG_KEY: env.VITE_PUBLIC_POSTHOG_KEY,
      VITE_PUBLIC_POSTHOG_HOST: env.VITE_PUBLIC_POSTHOG_HOST,
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
  setTutorialKitTheme();

  function setTutorialKitTheme() {
    let theme = localStorage.getItem('liblab_theme');

    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.querySelector('html')?.setAttribute('data-theme', theme);
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
  const theme = useStore(themeStore);
  const loaderData = useRouteLoaderData<LoaderData>('root');

  const { setCredits } = useCreditsStore();
  const { setDataSources } = useDataSourcesStore();

  useEffect(() => {
    if (loaderData?.credits) {
      setCredits(loaderData?.credits);
    }
  }, [loaderData?.credits]);

  useEffect(() => {
    if (loaderData?.dataSources) {
      setDataSources(loaderData?.dataSources);
    }
  }, [loaderData?.dataSources]);

  useEffect(() => {
    document.querySelector('html')?.setAttribute('data-theme', theme);
  }, [theme]);

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
