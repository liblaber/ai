import { type LinksFunction, type LoaderFunctionArgs, redirect } from '@remix-run/cloudflare';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteLoaderData } from '@remix-run/react';
import tailwindReset from '@unocss/reset/tailwind-compat.css?url';
import { stripIndents } from './utils/stripIndent';
import { createHead } from 'remix-island';
import { useEffect, useState } from 'react';
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
import { workbenchStore } from './lib/stores/workbench';
import type { LiblabAction } from '~/types/actions';
import { webcontainer } from './lib/webcontainer';

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

let i = 100;

// Function to extract PID for a given command from ps -ef output
function getCommandPid(psOutput: string, targetCommand: string): number | null {
  const lines = psOutput.trim().split('\n');

  // Skip the header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(/\s+/);

    // PID is the second column (index 1)
    if (parts.length >= 2) {
      const pid = parseInt(parts[1], 10);
      const cmd = parts.slice(7).join(' '); // Command starts from column 8

      if (cmd.includes(targetCommand)) {
        return pid;
      }
    }
  }

  return null;
}

// Helper Popover Component for Testing
function HelperPopover() {
  const [command, setCommand] = useState('');
  const [pid, setPid] = useState<number | null>(null);

  const handleExecute2 = async () => {
    try {
      const artifact = workbenchStore.firstArtifact;
      const runner = artifact?.runner;
      console.log({ runner });

      const action = {
        artifactId: artifact!.id || 'bla',
        messageId: '123',
        actionId: `${++i}`,
        action: {
          type: 'shell',
          content: command,
        } as LiblabAction,
        shouldExecute: true,
      };
      runner?.addAction(action);
      runner?.runAction(action);
    } catch (error) {
      console.error('Invalid JSON:', error);
    }
  };

  const handleExecute = async () => {
    try {
      const awaitedWebcontainer = await webcontainer;
      const process = await awaitedWebcontainer.spawn('ps', ['-ef']);
      const [_a, terminalOutput] = process.output.tee();

      terminalOutput.pipeTo(
        new WritableStream({
          write(data) {
            const foundPid = getCommandPid(data, command);
            setPid(foundPid);
            console.log(data);
            console.log(foundPid);
          },
        }),
      );
    } catch (error) {
      console.error('Invalid JSON:', error);
    }
  };

  const handleKill = async () => {
    if (pid === null) {
      console.log('No PID to kill');
      return;
    }

    try {
      const awaitedWebcontainer = await webcontainer;
      const process = await awaitedWebcontainer.spawn('kill', [pid.toString()]);
      console.log(`Killed process with PID: ${pid}`);
      setPid(null); // Reset PID after killing
    } catch (error) {
      console.error('Error killing process:', error);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 w-80">
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Testing Helper</h3>
      <textarea
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        placeholder="Enter command to find PID..."
        className="w-full h-32 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {pid !== null && (
        <div className="mt-2 p-2 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-600 rounded-md">
          <span className="text-sm text-green-800 dark:text-green-200">
            Found PID: <strong>{pid}</strong>
          </span>
        </div>
      )}
      <div className="mt-2 flex gap-2">
        <button
          onClick={handleExecute}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          Execute
        </button>
        <button
          onClick={handleKill}
          disabled={pid === null}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
        >
          Kill
        </button>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const loaderData = useRouteLoaderData<LoaderData>('root');

  const { setDataSources } = useDataSourcesStore();
  const { setPluginAccess } = usePluginStore();
  const { setDataSourceTypes } = useDataSourceTypesStore();

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
      <HelperPopover />
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
