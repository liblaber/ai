import React from 'react';
import { IconButton } from '~/components/ui/IconButton';
import { LoginButton } from './LoginButton';
import { LogoutButton } from './LogoutButton';
import { useSession } from '~/auth/auth-client';

export function UserMenu() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <IconButton className="bg-transparent">
        <div className="i-svg-spinners:90-ring-with-bg text-accent text-xl animate-spin"></div>
      </IconButton>
    );
  }

  return session ? <LogoutButton /> : <LoginButton />;
}
