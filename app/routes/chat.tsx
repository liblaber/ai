import { ClientOnly } from 'remix-utils/client-only';
import { Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
import { Background } from '~/components/ui/Background';
import { type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { requireAuth } from '~/auth/auth-middleware';

export const loader = requireAuth(async (args: LoaderFunctionArgs) => ({ id: args.params.id }));

export default function ChatLayout() {
  return (
    <div className="flex flex-col h-full w-full bg-liblab-elements-bg-depth-1">
      <Background />
      <Header />
      <ClientOnly fallback={<></>}>{() => <Chat />}</ClientOnly>
    </div>
  );
}
