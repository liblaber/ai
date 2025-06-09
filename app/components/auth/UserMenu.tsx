import React from 'react';
import { useSession } from '~/lib/auth-client';
import { IconButton } from '~/components/ui/IconButton';
import { LoginButton } from './LoginButton';
import { LogoutButton } from './LogoutButton';

export function UserMenu() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <IconButton className="bg-transparent">
        <div className="i-svg-spinners:90-ring-with-bg text-liblab-elements-loader-progress text-xl animate-spin"></div>
      </IconButton>
    );
  }

  return session ? <LogoutButton /> : <LoginButton />;
}
