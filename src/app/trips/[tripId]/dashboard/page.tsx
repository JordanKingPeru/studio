
"use client";

import DashboardView from '@/components/dashboard/DashboardView';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Trip, TripDetails, Activity, City, Expense } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, orderBy as firestoreOrderBy } from 'firebase/firestore';

async function fetchFullTripDetailsFromFirestore(tripId: string): Promise<TripDetails | null> {
  const tripDocRef = doc(db, "trips", tripId);
  const tripDocSnap = await getDoc(tripDocRef);

  if (!tripDocSnap.exists()) {
    console.warn(`Trip document with ID ${tripId} not found in Firestore.`);
    return null;
  }

  const tripBaseData = tripDocSnap.data() as Omit<Trip, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: any, updatedAt: any };

  const activitiesCollectionRef = collection(db, "trips", tripId, "activities");
  const activitiesQuery = query(activitiesCollectionRef, firestoreOrderBy("date"), firestoreOrderBy("order"), firestoreOrderBy("time"));
  const activitiesSnapshot = await getDocs(activitiesQuery);
  const fetchedActivities: Activity[] = activitiesSnapshot.docs.map(d => ({ id: d.id, ...d.data(), tripId } as Activity));

  const citiesCollectionRef = collection(db, "trips", tripId, "cities");
  const citiesQuery = query(citiesCollectionRef, firestoreOrderBy("arrivalDate"));
  const citiesSnapshot = await getDocs(citiesQuery);
  const fetchedCities: City[] = citiesSnapshot.docs.map(d => ({ id: d.id, ...d.data(), tripId } as City));

  const expensesCollectionRef = collection(db, "trips", tripId, "expenses");
  const expensesQuery = query(expensesCollectionRef, firestoreOrderBy("date", "desc"));
  const expensesSnapshot = await getDocs(expensesQuery);
  const fetchedManualExpenses: Expense[] = expensesSnapshot.docs.map(d => ({ id: d.id, ...d.data(), tripId } as Expense));

  const derivedExpensesFromActivities: Expense[] = fetchedActivities
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

  const allExpenses = [...derivedExpensesFromActivities, ...fetchedManualExpenses];
  const paises = Array.from(new Set(fetchedCities.map(city => city.country)));

  return {
    id: tripDocSnap.id,
    ownerUid: tripBaseData.ownerUid,
    userId: tripBaseData.ownerUid, // For TripDetails compatibility
    name: tripBaseData.name,
    startDate: tripBaseData.startDate,
    endDate: tripBaseData.endDate,
    coverImageUrl: tripBaseData.coverImageUrl,
    tripType: tripBaseData.tripType,
    tripStyle: tripBaseData.tripStyle,
    editorUids: tripBaseData.editorUids || [],
    pendingInvites: tripBaseData.pendingInvites || [],
    familia: tripBaseData.familia,
    createdAt: tripBaseData.createdAt?.toDate ? tripBaseData.createdAt.toDate().toISOString() : new Date(tripBaseData.createdAt || Date.now()).toISOString(),
    updatedAt: tripBaseData.updatedAt?.toDate ? tripBaseData.updatedAt.toDate().toISOString() : new Date(tripBaseData.updatedAt || Date.now()).toISOString(),
    ciudades: fetchedCities,
    paises,
    activities: fetchedActivities,
    expenses: allExpenses,
  };
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
          const data = await fetchFullTripDetailsFromFirestore(tripId);
          if (data) {
            setTripData(data);
          } else {
            setError(`No se encontraron detalles para el viaje con ID: ${tripId}. Asegúrate de que el viaje exista y tengas acceso.`);
          }
        } catch (e) {
          console.error("Error fetching trip data for dashboard from Firestore:", e);
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
        <p className="text-muted-foreground">No se pudo encontrar la información para este viaje. Verifica el ID o si el viaje fue eliminado.</p>
         <Link href="/" className="mt-4">
          <Button variant="outline">Volver a Mis Viajes</Button>
        </Link>
      </div>
    );
  }

  return <DashboardView tripId={tripId} initialTripData={tripData} />;
}
