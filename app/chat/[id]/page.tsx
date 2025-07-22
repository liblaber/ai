'use client';
import { Background } from '~/components/ui/Background';
import { Header } from '~/components/header/Header';
import { Chat } from '~/components/chat/Chat.client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatIdPage({ params }: PageProps) {
  const { id } = await params;

  // Pass the ID to the main chat component
  return (
    <div className="flex flex-col h-full w-full bg-liblab-elements-bg-depth-1">
      <Background />
      <Header />
      <Chat id={id} />
    </div>
  );
}
