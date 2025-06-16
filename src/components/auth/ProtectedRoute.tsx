
"use client";

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !currentUser) {
      // Only redirect to login if the user is NOT already on login or signup page
      if (pathname !== '/login' && pathname !== '/signup') {
        localStorage.setItem('intendedPath', pathname); // Save the path they were trying to access
        router.push('/login');
      }
      // If they ARE on /login or /signup and not authenticated, let them stay and navigate between them.
    }
  }, [currentUser, loading, router, pathname]);

  // Show loader if initial auth check is happening,
  // OR if user is not authenticated AND is trying to access a protected route (not /login or /signup).
  if (loading || (!currentUser && (pathname !== '/login' && pathname !== '/signup'))) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // If authenticated, or if not authenticated but on a public auth page (/login or /signup), render children.
  return <>{children}</>;
};

export default ProtectedRoute;
