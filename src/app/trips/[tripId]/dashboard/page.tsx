
"use client";

import DashboardView from '@/components/dashboard/DashboardView';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { TripDetails } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button'; // Added import
import Link from 'next/link'; // Added import

// Mock function to fetch full trip details including activities, cities etc.
// In a real app, this would fetch from Firestore or your backend.
async function fetchFullTripData(tripId: string): Promise<TripDetails | null> {
  console.log(`Fetching full trip data for tripId: ${tripId}`);
  await new Promise(resolve => setTimeout(resolve, 700)); // Simulate network delay

  const storedTrips = localStorage.getItem('familyTrips');
  if (storedTrips) {
    const trips: TripDetails[] = JSON.parse(storedTrips); // Assume stored trips are TripDetails for now
    const currentTrip = trips.find(t => t.id === tripId);
    if (currentTrip) {
      // Simulate fetching sub-collections if they weren't part of the main trip object
      // For this mock, we assume activities and cities are already part of the stored trip object
      // or we can use sampleTripDetails as a base.
      const { sampleTripDetails } = await import('@/lib/constants'); // Lazy load constants
      return {
        ...sampleTripDetails, // Base structure and potentially some default activities/cities
        ...currentTrip, // Override with specific trip data
        id: tripId, // Ensure the correct tripId is set
        // Ensure activities and cities are correctly associated with this tripId
        activities: (currentTrip.activities || sampleTripDetails.activities).map(a => ({ ...a, tripId })),
        ciudades: (currentTrip.ciudades || sampleTripDetails.ciudades).map(c => ({ ...c, tripId })),
        expenses: (currentTrip.expenses || sampleTripDetails.expenses).map(e => ({ ...e, tripId })),
      };
    }
  }
  // Fallback to sample trip details if not found in localStorage for mocking
  const { sampleTripDetails } = await import('@/lib/constants');
  if (tripId === sampleTripDetails.id) {
      return sampleTripDetails;
  }
  console.warn(`Trip with id ${tripId} not found in localStorage, returning null or default for sample.`);
  return null; 
}


export default function TripDashboardPage() {
  const params = useParams();
  const tripId = params.tripId as string;
  const [tripData, setTripData] = useState<TripDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tripId) {
      const loadTripData = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const data = await fetchFullTripData(tripId);
          if (data) {
            setTripData(data);
          } else {
            setError(`No se encontraron detalles para el viaje con ID: ${tripId}`);
          }
        } catch (e) {
          console.error("Error fetching trip data for dashboard:", e);
          setError(`Error al cargar los datos del viaje. ${(e as Error).message}`);
        } finally {
          setIsLoading(false);
        }
      };
      loadTripData();
    } else {
        setError("ID de viaje no proporcionado.");
        setIsLoading(false);
    }
  }, [tripId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Cargando datos del viaje...</p>
      </div>
    );
  }

  if (error) {
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center p-4">
        <h2 className="text-xl font-semibold text-destructive mb-2">Error al Cargar el Viaje</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">Intentar de Nuevo</Button>
        <Link href="/" className="mt-2">
          <Button variant="outline">Volver a Mis Viajes</Button>
        </Link>
      </div>
    );
  }
  
  if (!tripData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center p-4">
        <h2 className="text-xl font-semibold text-foreground mb-2">Viaje no Encontrado</h2>
        <p className="text-muted-foreground">No se pudo encontrar la información para este viaje.</p>
         <Link href="/" className="mt-4">
          <Button variant="outline">Volver a Mis Viajes</Button>
        </Link>
      </div>
    );
  }

  // Pass the specific tripId to DashboardView
  return <DashboardView tripId={tripId} initialTripData={tripData} />;
}

