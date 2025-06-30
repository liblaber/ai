import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import { Logo } from '~/components/Logo';
import { UserMenu } from '~/components/auth/UserMenu';
import { useSession } from '~/auth/auth-client';

interface Props {
  showMenuIcon?: boolean;
}

export function Header({ showMenuIcon = true }: Props) {
  const chat = useStore(chatStore);
  const { data: session } = useSession();

  return (
    <header
      className={classNames('flex items-center p-5 border-b h-[var(--header-height)] z-10', {
        'border-transparent': !chat.started,
        'border-liblab-elements-borderColor': chat.started,
      })}
    >
      <div className="flex items-center gap-2 z-logo text-liblab-elements-textPrimary cursor-pointer">
        {session?.user && showMenuIcon && <div className="i-liblab:ic_menu text-xl" />}
        <a href="/" className="ml-1 font-semibold text-accent flex items-center">
          <div className="h-8 flex items-center text-black dark:text-white">
            <Logo />
          </div>
        </a>
      </div>
      {chat.started && (
        <>
          <span className="flex-1 px-4 truncate text-center text-liblab-elements-textPrimary">
            <ClientOnly>{() => <ChatDescription />}</ClientOnly>
          </span>
          <ClientOnly>
            {() => (
              <div className="mr-1">
                <HeaderActionButtons />
              </div>
            )}
          </ClientOnly>
        </>
      )}

      <div className="ml-auto pl-8">
        <ClientOnly>{() => <UserMenu />}</ClientOnly>
      </div>
    </header>
  );
}
