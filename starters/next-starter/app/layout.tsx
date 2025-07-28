import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import SidebarNav from '@/components/building-blocks/sidebar-nav/SidebarNav';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'App',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SidebarProvider>
          <SidebarNav />
          <main className="flex-1 w-full px-10 py-3 relative">
            <SidebarTrigger className="absolute left-1 top-2" />
            {children}
          </main>
        </SidebarProvider>
      </body>
    </html>
  );
}
