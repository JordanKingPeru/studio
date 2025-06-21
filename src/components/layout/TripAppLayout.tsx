
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, CalendarDays, MapPinned, CircleDollarSign, MoreHorizontal, Compass, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useState, useEffect } from 'react';
import type { UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import SignOutButton from '@/components/auth/SignOutButton'; // Import SignOutButton
import UserAvatar from '@/components/auth/UserAvatar'; // Import UserAvatar

interface TripAppLayoutProps {
  children: React.ReactNode;
  tripId: string;
}

export default function TripAppLayout({ children, tripId }: TripAppLayoutProps) {
  const pathname = usePathname();
  const routerNav = useRouter(); 
  const { currentUser } = useAuth(); 
  const [tripName, setTripName] = useState<string | null>(null); 
  const [isLoadingName, setIsLoadingName] = useState(true); 

  useEffect(() => {
    const fetchTripDetails = async () => {
        setIsLoadingName(true);
        // Attempt to get trip name from Firestore if possible, or fallback.
        // This localStorage logic is a placeholder and might not be robust for shared trips.
        // A better approach would be to fetch the trip name directly from Firestore
        // using the tripId, but that would require making TripAppLayout an async component
        // or having a separate context/store for trip details.
        const storedTrips = localStorage.getItem('familyTrips'); // This is a weak dependency
        if (storedTrips && currentUser) {
            try {
                const trips: Array<{id: string, name: string, userId: string}> = JSON.parse(storedTrips);
                const currentTripObj = trips.find(t => t.id === tripId && t.userId === currentUser.uid);
                setTripName(currentTripObj?.name || `Viaje de ${currentUser.displayName?.split(' ')[0] || 'Usuario'}`);
            } catch (e) {
                 setTripName(`Viaje de ${currentUser.displayName?.split(' ')[0] || 'Usuario'}`);
            }
        } else if (currentUser) {
            setTripName(`Viaje de ${currentUser.displayName?.split(' ')[0] || 'Usuario'}`);
        } else {
            setTripName('Detalles del Viaje');
        }
        setIsLoadingName(false);
    };
    if (currentUser) { 
        fetchTripDetails();
    } else if (!currentUser && !isLoadingName) { 
        // Reset if user logs out while viewing a trip
        setIsLoadingName(true); 
        setTripName('Detalles del Viaje');
        setIsLoadingName(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, currentUser]); // Added currentUser to dependency array


  const navItems = [
    { href: `/trips/${tripId}/dashboard`, label: 'Inicio', icon: Home },
    { href: `/trips/${tripId}/map`, label: 'Mapa', icon: MapPinned },
    { href: `/trips/${tripId}/itinerary`, label: 'Itinerario', icon: CalendarDays },
    { href: `/trips/${tripId}/budget`, label: 'Presupuesto', icon: CircleDollarSign },
    { href: `/trips/${tripId}/more`, label: 'Más', icon: MoreHorizontal },
  ];

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    if (typeof window !== 'undefined') {
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);


  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between px-4">
            <Button variant="ghost" size="sm" onClick={() => routerNav.push('/')} className="flex items-center text-primary font-semibold p-1">
                <Compass className="h-5 w-5 mr-1.5" />
                <span className="text-sm">Mis Viajes</span>
            </Button>
            {isLoadingName || !currentUser ? (
                 <Skeleton className="h-6 w-32 rounded-md" />
            ) : (
                <h1 className="text-md font-bold text-foreground truncate" title={tripName || ""}>{tripName || "Cargando..."}</h1>
            )}
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-grow mb-16">{children}</main>
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border/40 shadow-t-lg z-50">
          <div className="container mx-auto h-full grid grid-cols-5 items-center">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href.endsWith('/dashboard') && pathname === `/trips/${tripId}`);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                      "flex flex-col items-center justify-center h-full w-full text-xs p-1 focus:outline-none focus:ring-2 focus:ring-primary rounded-none",
                      isActive ? "text-primary" : "text-muted-foreground hover:text-primary/80"
                    )}
                    aria-current={isActive ? "page" : undefined}
                >
                  <item.icon className={cn("h-5 w-5 mb-0.5", isActive ? "text-primary" : "")} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="fixed top-0 left-0 z-40 w-64 h-screen border-r bg-background transition-transform sm:translate-x-0">
        <div className="h-full px-3 py-4 overflow-y-auto flex flex-col">
          <Link href="/" className="flex items-center pl-2.5 mb-5 text-primary font-semibold">
            <Compass className="h-7 w-7 mr-2" />
            <span className="self-center text-xl font-headline whitespace-nowrap">OriGo</span>
          </Link>
          <div className="px-2.5 mb-3">
            {isLoadingName || !currentUser ? (
                <Skeleton className="h-7 w-48 rounded-md" />
            ) : (
                 <h2 className="text-lg font-semibold text-foreground truncate" title={tripName || ""}>{tripName || "Cargando..."}</h2>
            )}
          </div>
          <ul className="space-y-2 font-medium flex-grow">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href.endsWith('/dashboard') && pathname === `/trips/${tripId}`);
              return (
                <li key={item.label}>
                  <Button
                    asChild
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start",
                      isActive ? "text-primary font-semibold" : "text-foreground hover:bg-muted"
                    )}
                  >
                    <Link href={item.href} aria-current={isActive ? "page" : undefined}>
                      <item.icon className={cn("mr-3 h-5 w-5", isActive ? "" : "text-muted-foreground group-hover:text-foreground")} />
                      {item.label}
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ul>
          <div className="mt-auto space-y-2">
            {currentUser && (
                <div className="flex items-center gap-2 p-2 border-t border-border">
                    <UserAvatar user={currentUser} className="h-8 w-8"/>
                    <div className="flex flex-col text-sm min-w-0">
                        <span className="font-semibold text-foreground truncate">{currentUser.displayName || "Usuario"}</span>
                        <span className="text-xs text-muted-foreground truncate">{currentUser.email}</span>
                    </div>
                </div>
            )}
            <div className="flex items-center gap-2">
                <ThemeToggle />
                {currentUser && <SignOutButton className="flex-grow"/>}
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-grow p-0 sm:ml-64"> 
         <div className="container mx-auto px-0 py-0">
             {children}
         </div>
      </main>
    </div>
  );
}
