
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge'; // Added import
import Image from 'next/image';
import CreateTripWizard from '@/components/trips/CreateTripWizard';
import type { Trip } from '@/lib/types';
import { TripType, TripStyle } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { v4 as uuidv4 } from 'uuid'; // For generating mock trip IDs

// Mock API call
const fetchTrips = async (): Promise<Trip[]> => {
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  // Retrieve trips from localStorage or return a default list
  if (typeof window !== 'undefined') {
    const storedTrips = localStorage.getItem('familyTrips');
    if (storedTrips) {
      return JSON.parse(storedTrips);
    }
  }
  // Default mock trips if nothing in localStorage
  return [
    { 
      id: 'trip1', 
      userId: 'user123', 
      name: 'Verano en Italia 2025', 
      startDate: '2025-07-10', 
      endDate: '2025-07-25', 
      coverImageUrl: 'https://placehold.co/600x400.png?text=Italia+Summer',
      dataAiHint: 'italy landscape', 
      tripType: TripType.LEISURE, 
      tripStyle: TripStyle.FAMILY,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { 
      id: 'trip2', 
      userId: 'user123', 
      name: 'Conferencia de Negocios SF', 
      startDate: '2024-11-05', 
      endDate: '2024-11-08', 
      coverImageUrl: 'https://placehold.co/600x400.png?text=SF+Conference',
      dataAiHint: 'san francisco city', 
      tripType: TripType.BUSINESS, 
      tripStyle: TripStyle.CLASSIC,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
};

const saveTripsToLocalStorage = (trips: Trip[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('familyTrips', JSON.stringify(trips));
  }
};

interface TripCardProps {
  trip: Trip;
}

function TripCard({ trip }: TripCardProps) {
  return (
    <Link href={`/trips/${trip.id}/dashboard`} passHref>
      <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 h-full flex flex-col rounded-xl">
        {trip.coverImageUrl ? (
          <div className="relative w-full h-48">
            <Image
              src={trip.coverImageUrl}
              alt={`Cover image for ${trip.name}`}
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              data-ai-hint={(trip as any).dataAiHint || "travel destination"}
            />
          </div>
        ) : (
          <div className="w-full h-48 bg-muted flex items-center justify-center" data-ai-hint="travel placeholder">
            <span className="text-muted-foreground">Sin imagen de portada</span>
          </div>
        )}
        <CardHeader className="flex-grow">
          <CardTitle className="text-xl font-headline group-hover:text-primary">{trip.name}</CardTitle>
          <CardDescription className="text-sm">
            {format(parseISO(trip.startDate), "d MMM yyyy", { locale: es })} - {format(parseISO(trip.endDate), "d MMM yyyy", { locale: es })}
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Badge variant="outline" className="mr-2 capitalize text-xs">{trip.tripType.toLowerCase()}</Badge>
            <Badge variant="secondary" className="capitalize text-xs">{trip.tripStyle.toLowerCase()}</Badge>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function MyTripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  useEffect(() => {
    const loadTrips = async () => {
      setIsLoading(true);
      const fetchedTrips = await fetchTrips();
      setTrips(fetchedTrips);
      setIsLoading(false);
    };
    loadTrips();
  }, []);

  const handleTripCreated = (newTripData: Omit<Trip, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    const newTrip: Trip = {
      ...newTripData,
      id: uuidv4(), // Generate a unique ID
      userId: 'user123', // Mock user ID
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updatedTrips = [...trips, newTrip];
    setTrips(updatedTrips);
    saveTripsToLocalStorage(updatedTrips); // Persist to localStorage
    setIsWizardOpen(false);
    // Optionally navigate to the new trip's dashboard
    // router.push(`/trips/${newTrip.id}/dashboard`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <h1 className="text-2xl font-bold font-headline text-primary">Mis Viajes</h1>
          {/* ThemeToggle could be added here if desired */}
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="rounded-xl shadow-lg">
                <div className="w-full h-48 bg-muted animate-pulse"></div>
                <CardHeader>
                  <div className="h-6 bg-muted animate-pulse rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-1/2"></div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center h-[60vh]">
            <h2 className="text-2xl font-semibold text-foreground mb-3">¡Bienvenido/a!</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Parece que aún no has planeado ningún viaje. ¡Empecemos la aventura!
            </p>
            <Button size="lg" onClick={() => setIsWizardOpen(true)}>
              <Plus className="mr-2 h-5 w-5" />
              Crear mi Primer Viaje
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}

        <Button
          className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-xl z-50"
          size="icon"
          onClick={() => setIsWizardOpen(true)}
          aria-label="Crear Nuevo Viaje"
        >
          <Plus className="h-8 w-8" />
        </Button>
      </main>
      <CreateTripWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onTripCreated={handleTripCreated}
      />
      {/* Footer can be added here if needed */}
    </div>
  );
}
