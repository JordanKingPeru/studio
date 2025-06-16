
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
      // Save the intended path to redirect after login
      if (pathname !== '/login' && pathname !== '/signup') {
        localStorage.setItem('intendedPath', pathname);
      }
      router.push('/login');
    }
  }, [currentUser, loading, router, pathname]);

  if (loading || (!currentUser && (pathname !== '/login' && pathname !== '/signup'))) {
    // Show loader if still loading or if not authenticated and not on public auth pages
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // If authenticated or on a public auth page, render children
  if (currentUser || pathname === '/login' || pathname === '/signup') {
    return <>{children}</>;
  }

  // Fallback, should ideally be caught by useEffect redirect
  return null; 
};

export default ProtectedRoute;
