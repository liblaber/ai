import './styles/index.scss';
import '@unocss/reset/tailwind.css';
import type { ReactNode } from 'react';
import { ClientProviders } from './components/ClientProviders';
import './globals.css';
import { getDataSources } from '~/lib/services/datasourceService';
import { userService } from '~/lib/services/userService';
import PluginManager, { FREE_PLUGIN_ACCESS } from '~/lib/plugins/plugin-manager';
import { DataSourcePluginManager } from '~/lib/plugins/data-access/data-access-plugin-manager';
import { headers } from 'next/headers';
import { auth } from '~/auth/auth-config';

const inlineThemeCode = `
  setLiblabTheme();
  function setLiblabTheme() {
    document.querySelector('html')?.setAttribute('data-theme', 'dark');
  }
`;

export const metadata = {
  title: 'liblab ai',
  description: 'Build internal apps using AI',
};

async function getRootData() {
  try {
    // Get session from headers
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    let user = null;
    let dataSources: any[] = [];
    let pluginAccess = FREE_PLUGIN_ACCESS;
    let dataSourceTypes: any[] = [];

    if (session?.user) {
      // Get user profile
      user = await userService.getUser(session.user.id);

      // Get data sources for the user
      dataSources = await getDataSources(session.user.id);

      // Initialize plugin manager
      await PluginManager.getInstance().initialize();
      pluginAccess = PluginManager.getInstance().getAccessMap();

      // Get available data source types
      dataSourceTypes = DataSourcePluginManager.getAvailableDatabaseTypes();
    }

    return {
      user,
      dataSources,
      pluginAccess,
      dataSourceTypes,
    };
  } catch (error) {
    console.error('Error loading root data:', error);
    return {
      user: null,
      dataSources: [],
      pluginAccess: FREE_PLUGIN_ACCESS,
      dataSourceTypes: [],
    };
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  // const pathname = usePathname();/
  const rootData = await getRootData();

  return (
    <html lang="en" data-theme="dark">
      <head>
        <title>{metadata.title}</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
        />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap" />
        <script dangerouslySetInnerHTML={{ __html: inlineThemeCode }} />
      </head>
      <body className="w-full h-full bg-liblab-elements-bg-depth-1">
        <ClientProviders rootData={rootData}>{children}</ClientProviders>
      </body>
    </html>
  );
}
