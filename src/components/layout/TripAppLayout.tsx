
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CalendarDays, MapPinned, CircleDollarSign, MoreHorizontal, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useState, useEffect } from 'react';
import type { Trip } from '@/lib/types'; // Assuming Trip type is defined
import { Skeleton } from '@/components/ui/skeleton';

// Mock function, replace with actual data fetching
async function fetchTripName(tripId: string): Promise<string | null> {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
  const storedTrips = localStorage.getItem('familyTrips');
  if (storedTrips) {
    const trips: Trip[] = JSON.parse(storedTrips);
    const currentTrip = trips.find(t => t.id === tripId);
    return currentTrip?.name || `Viaje ${tripId.substring(0,6)}`;
  }
  return `Viaje ${tripId.substring(0,6)}`; // Fallback if not found
}


interface TripAppLayoutProps {
  children: React.ReactNode;
  tripId: string;
}

export default function TripAppLayout({ children, tripId }: TripAppLayoutProps) {
  const pathname = usePathname();
  const [tripName, setTripName] = useState<string | null>(null);
  const [isLoadingName, setIsLoadingName] = useState(true);

  useEffect(() => {
    setIsLoadingName(true);
    fetchTripName(tripId).then(name => {
      setTripName(name);
      setIsLoadingName(false);
    });
  }, [tripId]);

  const navItems = [
    { href: `/trips/${tripId}/dashboard`, label: 'Inicio', icon: Home },
    { href: `/trips/${tripId}/itinerary`, label: 'Itinerario', icon: CalendarDays },
    { href: `/trips/${tripId}/map`, label: 'Mapa', icon: MapPinned },
    { href: `/trips/${tripId}/budget`, label: 'Presupuesto', icon: CircleDollarSign },
    { href: `/trips/${tripId}/more`, label: 'Más', icon: MoreHorizontal },
  ];

  // Determine if we are on mobile based on screen width (example breakpoint: 768px)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);


  if (isMobile) {
    // Mobile: Bottom Tab Bar
    return (
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between px-4">
            <Link href="/" className="flex items-center text-primary font-semibold">
                <Briefcase className="h-6 w-6 mr-2" />
                <span className="text-sm">Mis Viajes</span>
            </Link>
            {isLoadingName ? (
                 <Skeleton className="h-6 w-32 rounded-md" />
            ) : (
                <h1 className="text-md font-bold text-foreground truncate" title={tripName || ""}>{tripName || "Cargando..."}</h1>
            )}
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-grow mb-16">{children}</main> {/* mb-16 for bottom tab bar height */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border/40 shadow-t-lg z-50">
          <div className="container mx-auto h-full grid grid-cols-5 items-center">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href.endsWith('/dashboard') && pathname === `/trips/${tripId}`);
              return (
                <Link key={item.label} href={item.href} passHref>
                  <Button
                    variant="ghost"
                    className={cn(
                      "flex flex-col items-center justify-center h-full w-full rounded-none text-xs p-1",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <item.icon className={cn("h-5 w-5 mb-0.5", isActive ? "text-primary" : "")} />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    );
  }

  // Desktop: Sidebar
  return (
    <div className="flex min-h-screen">
      <aside className="fixed top-0 left-0 z-40 w-64 h-screen border-r bg-background transition-transform -translate-x-full sm:translate-x-0">
        <div className="h-full px-3 py-4 overflow-y-auto">
          <Link href="/" className="flex items-center pl-2.5 mb-5 text-primary font-semibold">
            <Briefcase className="h-7 w-7 mr-2" />
            <span className="self-center text-xl font-headline whitespace-nowrap">Family Planner</span>
          </Link>
          <div className="px-2.5 mb-3">
            {isLoadingName ? (
                <Skeleton className="h-7 w-48 rounded-md" />
            ) : (
                 <h2 className="text-lg font-semibold text-foreground truncate" title={tripName || ""}>{tripName || "Cargando..."}</h2>
            )}
          </div>
          <ul className="space-y-2 font-medium">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href.endsWith('/dashboard') && pathname === `/trips/${tripId}`);
              return (
                <li key={item.label}>
                  <Link href={item.href} passHref>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start",
                        isActive ? "text-primary-foreground bg-primary hover:bg-primary/90" : "text-foreground hover:bg-muted"
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <item.icon className={cn("mr-3 h-5 w-5", isActive ? "" : "text-muted-foreground group-hover:text-foreground")} />
                      {item.label}
                    </Button>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="absolute bottom-4 left-0 right-0 px-3">
            <ThemeToggle />
          </div>
        </div>
      </aside>
      <main className="flex-grow p-4 sm:ml-64">
         <div className="container mx-auto px-0 py-0"> {/* Adjusted padding */}
             {children}
         </div>
      </main>
    </div>
  );
}
