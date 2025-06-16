
"use client";

import type { UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image'; // Using next/image for better optimization if needed

interface UserAvatarProps {
  user: UserProfile | null;
  className?: string;
}

export default function UserAvatar({ user, className }: UserAvatarProps) {
  if (!user) {
    return (
      <Avatar className={className}>
        <AvatarFallback>?</AvatarFallback>
      </Avatar>
    );
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    const nameParts = name.split(' ');
    if (nameParts.length > 1) {
      return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <Avatar className={className}>
      {user.photoURL ? (
        <AvatarImage asChild src={user.photoURL} alt={user.displayName || 'User Avatar'}>
            {/* Using next/image inside AvatarImage for optimization benefits */}
            <Image 
                src={user.photoURL} 
                alt={user.displayName || 'User Avatar'} 
                width={40} // Match typical avatar size
                height={40}
                className="rounded-full object-cover" 
            />
        </AvatarImage>
      ) : null}
      <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
    </Avatar>
  );
}
