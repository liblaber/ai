import type { User } from 'better-auth/types';
import React from 'react';
import { LuCircleUser } from 'react-icons/lu';

interface ProfilePictureProps {
  user: User | null | undefined;
}

export function ProfilePicture({ user }: ProfilePictureProps) {
  return (
    <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-white bg-liblab-elements-hover">
      {user?.image ? (
        <img
          src={user.image}
          alt="User"
          crossOrigin="anonymous"
          className="w-full h-full object-cover"
          referrerPolicy={'no-referrer'}
        />
      ) : (
        <LuCircleUser className="text-gray h-6 w-6" />
      )}
    </div>
  );
}
