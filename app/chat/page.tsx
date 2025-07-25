'use client';

import { Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
import { Background } from '~/components/ui/Background';

export default function ChatLayout() {
  return (
    <div className="flex flex-col h-full w-full bg-liblab-elements-bg-depth-1">
      <Background />
      <Header />
      <Chat />
    </div>
  );
}
