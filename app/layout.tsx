import './styles/index.scss';
import '@unocss/reset/tailwind.css';
import type { ReactNode } from 'react';
import { ClientProviders } from './components/ClientProviders';
import './globals.css';

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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
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
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
