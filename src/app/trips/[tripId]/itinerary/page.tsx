
"use client";

import ItinerarySection from '@/components/itinerary/ItinerarySection';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { TripDetails, Activity } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch, serverTimestamp, query, orderBy as firestoreOrderBy, addDoc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';

// Mock function to fetch full trip details
async function fetchFullTripDataForItinerary(tripId: string): Promise<TripDetails | null> {
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

export default function TripItineraryPage() {
  const params = useParams();
  const tripId = params.tripId as string;
  const [tripData, setTripData] = useState<TripDetails | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchActivities = useCallback(async () => {
    if (!tripId) return;
    setIsLoading(true);
    try {
      const activitiesCollectionRef = collection(db, "trips", tripId, "activities");
      const q = query(activitiesCollectionRef, firestoreOrderBy("date"), firestoreOrderBy("order"), firestoreOrderBy("time"));
      const querySnapshot = await getDocs(q);
      const fetchedActivities: Activity[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), tripId } as Activity));
      setActivities(fetchedActivities);

      // Update tripData with fetched activities
      if (tripData) {
        setTripData(prev => prev ? ({ ...prev, activities: fetchedActivities }) : null);
      }

    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: `No se pudieron cargar actividades: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  }, [tripId, toast, tripData]); // Added tripData to dependencies

  useEffect(() => {
    if (tripId) {
      const loadInitialData = async () => {
        setIsLoading(true);
        const initialData = await fetchFullTripDataForItinerary(tripId);
        setTripData(initialData);
        if (initialData) {
          setActivities(initialData.activities || []);
        }
        // Fetch live activities after setting initial data
        await fetchActivities(); 
        // setIsLoading(false); // fetchActivities will handle this
      };
      loadInitialData();
    }
  }, [tripId, fetchActivities]); // fetchActivities is now a dependency

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
      fetchActivities();
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
      fetchActivities();
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
      fetchActivities();
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

