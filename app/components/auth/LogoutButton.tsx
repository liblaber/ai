import React, { useEffect, useRef, useState } from 'react';
import { signOut, useSession } from '~/auth/auth-client';
import { useRouter } from 'next/navigation';
import { ProfilePicture } from './ProfilePicture';
import { useAuthProvidersPlugin } from '~/lib/hooks/plugins/useAuthProvidersPlugin';
import { chatStore } from '~/lib/stores/chat';

export function LogoutButton() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data } = useSession();
  const user = data?.user;
  const router = useRouter();
  const { anonymousProvider } = useAuthProvidersPlugin();

  const handleLogout = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push('/');
        },
      },
    });
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mouseup', handleClickOutside);

    return () => {
      document.removeEventListener('mouseup', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center rounded-full hover:opacity-80 transition-opacity"
        aria-label="User menu"
        title="User menu"
        style={{ backgroundColor: 'transparent' }}
      >
        <ProfilePicture user={user} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 bg-liblab-elements-background rounded-lg shadow-xs z-10 overflow-hidden border border-liblab-elements-borderColor bg-liblab-elements-bg-depth-1">
          <div className="px-4 py-2.5 border-b border-liblab-elements-borderColor bg-liblab-elements-hover/30">
            <div className="font-medium text-liblab-elements-textPrimary truncate text-sm">{user?.name || 'User'}</div>
            <div className="text-xs text-liblab-elements-textSecondary truncate">{user?.email || ''}</div>
          </div>

          {/* Menu options */}
          {!anonymousProvider && (
            <div className="py-1">
              <button
                onClick={async () => {
                  await handleLogout();
                  chatStore.setKey('started', false);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-liblab-elements-textPrimary hover:bg-liblab-elements-item-backgroundAccent hover:text-liblab-elements-item-contentAccent transition-colors flex items-center text-sm group"
                style={{ backgroundColor: 'transparent' }}
              >
                <span className="i-ph:sign-out w-4 h-4 mr-2 group-hover:text-liblab-elements-item-contentAccent transition-colors" />
                <span className="group-hover:translate-x-0.5 transition-transform duration-150">Logout</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
