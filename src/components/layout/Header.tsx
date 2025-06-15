
// This Header component is likely for the "Full Itinerary View" (when not on the dashboard page of a trip)
// or might be deprecated/merged into TripAppLayout.
// For Phase 1, the "Mis Viajes" page has its own simple header,
// and TripAppLayout handles navigation within a trip.

import Link from 'next/link';
import { CalendarHeart, ListChecks, MapPin, PiggyBank, Briefcase } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Header() {
  const navItems = [
    // These links are relative, may not work correctly outside specific trip page context.
    // Consider making them absolute or dynamic based on current tripId if this header is reused.
    { href: '#itinerary', label: 'Itinerario', icon: <ListChecks size={20} /> },
    { href: '#calendar', label: 'Calendario', icon: <CalendarHeart size={20} /> },
    { href: '#map', label: 'Mapa', icon: <MapPin size={20} /> },
    { href: '#budget', label: 'Presupuesto', icon: <PiggyBank size={20} /> },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center space-x-2 min-w-0">
          <Briefcase className="h-7 w-7 text-primary shrink-0" />
          <span className="font-headline text-xl sm:text-2xl font-bold text-foreground truncate">Family Trip Planner</span>
        </Link>
        <div className="flex items-center space-x-4">
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href} // These hash links are for same-page navigation
                className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
