
"use client";

import ItinerarySection from '@/components/itinerary/ItinerarySection';
import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import type { Trip, TripDetails, Activity, City } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch, serverTimestamp, query, orderBy as firestoreOrderBy, addDoc, getDoc as getFirestoreDoc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';

// Function to fetch base trip data from Firestore
async function fetchBaseTripData(tripId: string): Promise<Trip | null> {
  const tripRef = doc(db, "trips", tripId);
  const tripSnap = await getFirestoreDoc(tripRef);
  if (!tripSnap.exists()) {
    console.warn(`Base trip data for ID ${tripId} not found.`);
    return null;
  }
  const data = tripSnap.data();
  return {
    id: tripSnap.id,
    userId: data.userId,
    name: data.name,
    startDate: data.startDate,
    endDate: data.endDate,
    coverImageUrl: data.coverImageUrl,
    tripType: data.tripType,
    tripStyle: data.tripStyle,
    familia: data.familia,
    collaborators: data.collaborators,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date(data.createdAt || Date.now()).toISOString(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : new Date(data.updatedAt || Date.now()).toISOString(),
  } as Trip;
}


export default function TripItineraryPage() {
  const params = useParams();
  const tripId = params.tripId as string;
  const [tripData, setTripData] = useState<TripDetails | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchActivitiesAndCities = useCallback(async () => {
    if (!tripId) return;
    try {
      const activitiesCollectionRef = collection(db, "trips", tripId, "activities");
      const actQuery = query(activitiesCollectionRef, firestoreOrderBy("date"), firestoreOrderBy("order"), firestoreOrderBy("time"));
      const activitiesSnapshot = await getDocs(actQuery);
      const fetchedActivities: Activity[] = activitiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), tripId } as Activity));
      setActivities(fetchedActivities);

      const citiesCollectionRef = collection(db, "trips", tripId, "cities");
      const cityQuery = query(citiesCollectionRef, firestoreOrderBy("arrivalDate"));
      const citiesSnapshot = await getDocs(cityQuery);
      const fetchedCities: City[] = citiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), tripId } as City));
      
      setTripData(prev => {
        if (!prev) return null; 
        const paises = Array.from(new Set(fetchedCities.map(city => city.country)));
        return { ...prev, activities: fetchedActivities, ciudades: fetchedCities, paises };
      });

    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: `No se pudieron cargar actividades/ciudades: ${error.message}` });
    }
  }, [tripId, toast]);

  useEffect(() => {
    let isMounted = true;
    if (tripId) {
      const loadInitialData = async () => {
        if (!isMounted) return;
        setIsLoading(true);
        try {
          const baseTripData = await fetchBaseTripData(tripId);
          if (!isMounted) return;

          if (baseTripData) {
            setTripData({
              ...baseTripData,
              activities: [], 
              ciudades: [],   
              expenses: [],   
              paises: [],     
            });
            await fetchActivitiesAndCities(); 
          } else {
            toast({ variant: "destructive", title: "Error", description: `No se encontraron datos del viaje con ID: ${tripId}.`});
            setTripData(null); // Explicitly set to null if base trip not found
          }
        } catch (e) {
          if (!isMounted) return;
          toast({ variant: "destructive", title: "Error", description: `No se pudieron cargar datos del itinerario.`});
          console.error("Error loading initial itinerary data:", e);
          setTripData(null);
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      };
      loadInitialData();
    } else {
        setIsLoading(false);
        setTripData(null);
    }
    return () => { isMounted = false; };
  }, [tripId, fetchActivitiesAndCities, toast]);

  const handleAddOrUpdateActivity = async (activity: Activity) => {
    if (!tripId) return;
    const activityId = activity.id && !activity.id.startsWith('temp-') ? activity.id : doc(collection(db, "trips", tripId, "activities")).id;
    const activityRef = doc(db, "trips", tripId, "activities", activityId);
    const activityDataForFirestore: Record<string, any> = { ...activity, id: activityId, tripId };
    delete (activityDataForFirestore as any).initialTripData;

     for (const key in activityDataForFirestore) {
      if (activityDataForFirestore[key] === undefined) delete activityDataForFirestore[key];
    }
    activityDataForFirestore.updatedAt = serverTimestamp();
    if (!activities.find(a => a.id === activityId)) activityDataForFirestore.createdAt = serverTimestamp();

    try {
      await setDoc(activityRef, activityDataForFirestore, { merge: true });
      toast({ title: "Éxito", description: `Actividad "${activity.title}" guardada.` });
      fetchActivitiesAndCities(); 
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: `No se pudo guardar actividad: ${error.message}` });
      throw error;
    }
  };

  const handleSetActivitiesBatchUpdate = async (updatedActivities: Activity[]) => {
    if (!tripId) return;
    const batch = writeBatch(db);
    updatedActivities.forEach(activity => {
      if (activity.id && !activity.id.startsWith('temp-')) {
        const activityRef = doc(db, "trips", tripId, "activities", activity.id);
        const updatePayload: Partial<Activity> = { ...activity, tripId };
        const sanitizedPayload: Record<string, any> = {};
        for (const key in updatePayload) {
          if (updatePayload[key as keyof Activity] !== undefined && key !== 'id' && key !== 'initialTripData') {
            sanitizedPayload[key] = updatePayload[key as keyof Activity];
          }
        }
        sanitizedPayload.updatedAt = serverTimestamp();
        if (Object.keys(sanitizedPayload).length > 1) batch.update(activityRef, sanitizedPayload);
      }
    });
    try {
      await batch.commit();
      fetchActivitiesAndCities(); 
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: `Error al reordenar: ${error.message}` });
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!tripId) return;
    const activityToDelete = activities.find(a => a.id === activityId);
    if (!activityToDelete) return;
    try {
      const activityRef = doc(db, "trips", tripId, "activities", activityId);
      await deleteDoc(activityRef);
      toast({ title: "Eliminada", description: `Actividad "${activityToDelete.title}" eliminada.` });
      fetchActivitiesAndCities(); 
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: `No se pudo eliminar: ${error.message}` });
    }
  };

  if (isLoading || !tripData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Cargando itinerario...</p>
      </div>
    );
  }

  return (
    <div className="py-8">
      <ItinerarySection
        tripData={tripData}
        activities={activities}
        onAddOrUpdateActivity={handleAddOrUpdateActivity}
        onSetActivities={handleSetActivitiesBatchUpdate}
        onDeleteActivity={handleDeleteActivity}
        tripId={tripId}
      />
    </div>
  );
}
