import { notFound } from 'next/navigation';
import { prisma } from '~/lib/prisma';
import AppViewer from './AppViewer';

interface AppPageProps {
  params: Promise<{ chatId: string }>;
}

export default async function AppPage({ params }: AppPageProps) {
  const { chatId } = await params;

  // Find the website by chatId
  const website = await prisma.website.findFirst({
    where: {
      chatId,
      // Only show public websites or websites created by the current user
    },
    include: {
      environment: {
        select: {
          id: true,
          name: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!website) {
    notFound();
  }

  if (!website.siteUrl) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">App Not Deployed</h1>
          <p className="text-gray-600 dark:text-gray-400">This app hasn't been deployed yet.</p>
        </div>
      </div>
    );
  }

  return <AppViewer website={website} />;
}

export async function generateMetadata({ params }: AppPageProps) {
  const { chatId } = await params;

  const website = await prisma.website.findFirst({
    where: { chatId },
    select: { siteName: true, siteUrl: true },
    orderBy: { updatedAt: 'desc' },
  });

  if (!website) {
    return {
      title: 'App Not Found',
    };
  }

  return {
    title: website.siteName || 'Deployed App',
    description: `View the deployed application: ${website.siteName || 'Untitled App'}`,
  };
}
