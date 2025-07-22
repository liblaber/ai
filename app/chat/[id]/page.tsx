'use client';
import { Background } from '~/components/ui/Background';
import { Header } from '~/components/header/Header';
import { Chat } from '~/components/chat/Chat.client';
import { useSession } from '~/auth/auth-client';
import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatIdPage({ params }: PageProps) {
  const { id } = await params;
  const session = useSession();

  if (!session) {
    redirect('/');
  }

  // Pass the ID to the main chat component
  return (
    <div className="flex flex-col h-full w-full bg-liblab-elements-bg-depth-1">
      <Background />
      <Header />
      <Chat id={id} />
    </div>
  );
}
