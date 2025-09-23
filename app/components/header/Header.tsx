'use client';
import { ClientOnly } from '~/components/ui/ClientOnly';
import { IconButton } from '~/components/ui/IconButton';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ConversationSettings } from '~/lib/persistence/ConversationSettings';
import { Logo } from '~/components/Logo';
import { UserMenu } from '~/components/auth/UserMenu';
import { useSession } from '~/auth/auth-client';
import { Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface Props {
  showMenuIcon?: boolean;
}

export function Header({ showMenuIcon = true }: Props) {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <header
      className={classNames('flex items-center p-5 border-b h-[var(--header-height)] z-10', {
        'border-transparent': !pathname.startsWith('/chat'),
        'border-depth-3': pathname.startsWith('/chat'),
      })}
    >
      <div className="flex items-center gap-2 z-logo text-primary cursor-pointer">
        {showMenuIcon && (
          <ClientOnly>
            {() =>
              session?.user && (
                <IconButton size="xl" title="Open sidebar" className="mr-2">
                  <Menu className="text-xl" />
                </IconButton>
              )
            }
          </ClientOnly>
        )}
        <Link href="/" className="ml-1 font-semibold text-accent flex items-center">
          <div className="h-8 flex items-center text-black dark:text-white">
            <Logo />
          </div>
        </Link>
      </div>
      {pathname.startsWith('/chat') && (
        <>
          <span className="flex-1 px-4 truncate text-center text-primary">
            <ClientOnly>{() => <ConversationSettings />}</ClientOnly>
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
