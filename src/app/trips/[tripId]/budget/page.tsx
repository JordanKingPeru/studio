
"use client";

import BudgetSection from '@/components/budget/BudgetSection';
import { useParams } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback } from 'react';
import type { TripDetails, Expense, Activity, City } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy as firestoreOrderBy } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';

// Mock function to fetch full trip details
async function fetchFullTripDataForBudget(tripId: string): Promise<TripDetails | null> {
  await new Promise(resolve => setTimeout(resolve, 500));
  const storedTrips = localStorage.getItem('familyTrips');
  if (storedTrips) {
    const trips: TripDetails[] = JSON.parse(storedTrips);
    const currentTrip = trips.find(t => t.id === tripId);
     if (currentTrip) {
      const { sampleTripDetails } = await import('@/lib/constants');
      return {
        ...sampleTripDetails,
        ...currentTrip,
        id: tripId,
        activities: (currentTrip.activities || sampleTripDetails.activities).map(a => ({ ...a, tripId })),
        ciudades: (currentTrip.ciudades || sampleTripDetails.ciudades).map(c => ({ ...c, tripId })),
        expenses: (currentTrip.expenses || sampleTripDetails.expenses).map(e => ({ ...e, tripId })),
      };
    }
  }
  const { sampleTripDetails } = await import('@/lib/constants');
  if (tripId === sampleTripDetails.id) return sampleTripDetails;
  return null;
}

export default function TripBudgetPage() {
  const params = useParams();
  const tripId = params.tripId as string;
  const [tripData, setTripData] = useState<TripDetails | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchTripSubCollections = useCallback(async () => {
    if (!tripId) return;
    setIsLoading(true);
    try {
      // Fetch Activities (for deriving expenses)
      const activitiesCollectionRef = collection(db, "trips", tripId, "activities");
      const activitiesQuery = query(activitiesCollectionRef, firestoreOrderBy("date"), firestoreOrderBy("order"), firestoreOrderBy("time"));
      const activitiesSnapshot = await getDocs(activitiesQuery);
      const fetchedActivities: Activity[] = activitiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), tripId } as Activity));
      setActivities(fetchedActivities);

      // Fetch Cities (for budget per city in ExpenseForm if used)
      const citiesCollectionRef = collection(db, "trips", tripId, "cities");
      const citiesQuery = query(citiesCollectionRef, firestoreOrderBy("arrivalDate"));
      const citiesSnapshot = await getDocs(citiesQuery);
      const fetchedCities: City[] = citiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), tripId } as City));
      setCities(fetchedCities);
      
      // Update tripData if it's already loaded
      if (tripData) {
          setTripData(prev => prev ? ({...prev, activities: fetchedActivities, ciudades: fetchedCities }) : null);
      }

    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: `No se pudieron cargar datos para presupuesto: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  }, [tripId, toast, tripData]); // Added tripData to dependencies


  useEffect(() => {
    if (tripId) {
      const loadInitialData = async () => {
        setIsLoading(true);
        const initialData = await fetchFullTripDataForBudget(tripId);
        setTripData(initialData);
        if (initialData) {
          setActivities(initialData.activities || []);
          setCities(initialData.ciudades || []);
        }
        // Fetch live sub-collections after setting initial data
        await fetchTripSubCollections();
        // setIsLoading(false); // fetchTripSubCollections will handle this
      };
      loadInitialData();
    }
  }, [tripId, fetchTripSubCollections]); // fetchTripSubCollections is now a dependency

  const derivedExpenses = useMemo((): Expense[] => {
    return activities
      .filter(activity => typeof activity.cost === 'number' && activity.cost > 0)
      .map(activity => ({
        id: `${activity.id}-expense`,
        tripId: activity.tripId,
        city: activity.city,
        date: activity.date,
        category: activity.category,
        description: activity.title,
        amount: Number(activity.cost || 0),
      }));
  }, [activities]);

  if (isLoading || !tripData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Cargando presupuesto...</p>
      </div>
    );
  }
  
  return (
    <div className="py-8">
      <BudgetSection
        expenses={derivedExpenses}
        tripCities={cities} // Pass the fetched cities
        tripId={tripId}
      />
    </div>
  );
}
