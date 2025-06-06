import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json, type MetaFunction } from '@remix-run/cloudflare';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { GitUrlImport } from '~/components/git/GitUrlImport.client';
import { Header } from '~/components/header/Header';

export const meta: MetaFunction = () => {
  return [{ title: 'liblab builder' }, { name: 'description', content: 'Talk with liblab builder' }];
};

export async function loader(args: LoaderFunctionArgs) {
  return json({ url: args.params.url });
}

export default function Index() {
  return (
    <div className="flex flex-col h-full w-full bg-liblab-elements-bg-depth-1">
      <Header />
      <ClientOnly fallback={<BaseChat />}>{() => <GitUrlImport />}</ClientOnly>
    </div>
  );
}
