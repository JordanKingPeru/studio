import Link from 'next/link';
import { CalendarHeart, ListChecks, MapPin, PiggyBank, Briefcase } from 'lucide-react';

export default function Header() {
  const navItems = [
    { href: '#itinerary', label: 'Itinerario', icon: <ListChecks size={20} /> },
    { href: '#calendar', label: 'Calendario', icon: <CalendarHeart size={20} /> },
    { href: '#map', label: 'Mapa', icon: <MapPin size={20} /> },
    { href: '#budget', label: 'Presupuesto', icon: <PiggyBank size={20} /> },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center space-x-2">
          <Briefcase className="h-7 w-7 text-primary" />
          <span className="font-headline text-2xl font-bold text-foreground">Family Trip Planner</span>
        </Link>
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
        {/* Placeholder for Mobile Menu Trigger & Theme Toggle if needed */}
      </div>
    </header>
  );
}
