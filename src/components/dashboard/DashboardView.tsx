
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { TripDetails, Activity, City, Expense } from '@/lib/types'; // Added Expense
import TripHeader from './TripHeader';
import ItinerarySection from '@/components/itinerary/ItinerarySection';
import CalendarSection from '@/components/calendar/CalendarSection';
import MapSection from '@/components/map/MapSection';
import BudgetSection from '@/components/budget/BudgetSection';
import { Separator } from '@/components/ui/separator';
import TodayView from './TodayView';
import UpcomingMilestone from './UpcomingMilestone';
import BudgetSnapshot from './BudgetSnapshot';
import QuickActions from './QuickActions';
import { parseISO, isWithinInterval } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch, serverTimestamp, query, orderBy as firestoreOrderBy, FieldValue } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';


interface DashboardViewProps {
  tripData: TripDetails; 
}

const TRIP_ID = "defaultTrip"; 

export default function DashboardView({ tripData: initialStaticTripData }: DashboardViewProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [showFullItinerary, setShowFullItinerary] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Set current date on mount and update every minute
    setCurrentDate(new Date());
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchActivities = useCallback(async () => {
    setIsLoadingActivities(true);
    try {
      const activitiesCollectionRef = collection(db, "trips", TRIP_ID, "activities");
      const q = query(activitiesCollectionRef, firestoreOrderBy("date"), firestoreOrderBy("order"), firestoreOrderBy("time"));
      const querySnapshot = await getDocs(q);
      const fetchedActivities: Activity[] = [];
      querySnapshot.forEach((doc) => {
        fetchedActivities.push({ id: doc.id, ...doc.data() } as Activity);
      });
      setActivities(fetchedActivities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      toast({
        variant: "destructive",
        title: "Error al cargar actividades",
        description: "No se pudieron cargar las actividades desde la base de datos.",
      });
    } finally {
      setIsLoadingActivities(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const currentTripDataForWidgets = useMemo((): TripDetails => ({
    ...initialStaticTripData,
    activities: activities, 
    expenses: initialStaticTripData.expenses || [], // Ensure expenses is always an array
  }), [initialStaticTripData, activities]);


  const currentCityToday = useMemo((): City | undefined => {
    if (!currentDate || !initialStaticTripData.ciudades) return undefined;
    const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    return initialStaticTripData.ciudades.find(city => {
      const arrival = parseISO(city.arrivalDate);
      const departure = parseISO(city.departureDate);
      return isWithinInterval(currentDateOnly, { start: arrival, end: departure });
    });
  }, [currentDate, initialStaticTripData.ciudades]);

  const handleAddOrUpdateActivity = async (activity: Activity) => {
    const activityId = activity.id && !activity.id.startsWith('temp-') ? activity.id : doc(collection(db, "trips", TRIP_ID, "activities")).id;
    const activityRef = doc(db, "trips", TRIP_ID, "activities", activityId);
    
    const activityBaseData: Partial<Activity> = {
      ...activity,
      id: activityId, 
      updatedAt: serverTimestamp() as FieldValue,
    };

    if (!activities.find(a => a.id === activityId)) { 
        activityBaseData.createdAt = serverTimestamp() as FieldValue;
    }

    // Prepare data for Firestore, ensuring 'cost' is not undefined
    const dataToSave = { ...activityBaseData };
    if (dataToSave.cost === undefined) {
      delete dataToSave.cost;
    }
    // Ensure notes is not undefined (if it's an optional field you don't want to store as undefined)
    if (dataToSave.notes === undefined) {
        delete dataToSave.notes;
    }
    // Ensure attachments is not undefined. Firestore handles empty arrays fine.
    if (dataToSave.attachments === undefined) {
        delete dataToSave.attachments;
    } else if (dataToSave.attachments === null) { // Also handle null if it could occur
        delete dataToSave.attachments;
    }


    try {
      await setDoc(activityRef, dataToSave, { merge: true });
      toast({
        title: activity.id && !activity.id.startsWith('temp-') ? "Actividad Actualizada" : "Actividad Añadida",
        description: `"${activity.title}" ha sido guardada.`,
      });
      fetchActivities(); 
    } catch (error) {
      console.error("Error saving activity:", error);
      toast({
        variant: "destructive",
        title: "Error al guardar actividad",
        description: `No se pudo guardar la actividad en la base de datos. Error: ${(error as Error).message}`,
      });
    }
  };
  
  const handleSetActivitiesBatchUpdate = async (updatedActivities: Activity[]) => {
    const batch = writeBatch(db);
    updatedActivities.forEach(activity => {
      if (activity.id && !activity.id.startsWith('temp-')) {
        const activityRef = doc(db, "trips", TRIP_ID, "activities", activity.id);
        const activityData: Partial<Activity> = { 
          order: activity.order, 
          time: activity.time,
          date: activity.date, 
          city: activity.city, 
          updatedAt: serverTimestamp() as FieldValue 
        };
        // Defensively remove cost if undefined, though DND usually doesn't change it.
        if (activity.cost === undefined) {
            // If cost is part of what DND could change and it becomes undefined, delete it
            // delete activityData.cost; // This line is commented as DND primarily affects order/time
        } else {
            activityData.cost = activity.cost;
        }
        batch.update(activityRef, activityData);
      }
    });

    try {
      await batch.commit();
      setActivities(updatedActivities); 
      // fetchActivities(); // Optionally re-fetch to ensure full consistency
    } catch (error) {
      console.error("Error batch updating activities:", error);
      toast({
        variant: "destructive",
        title: "Error al Reordenar",
        description: "No se pudo guardar el nuevo orden de las actividades.",
      });
    }
  };

  const handleDeleteActivityInternal = async (activityId: string) => {
     const activityToDelete = activities.find(a => a.id === activityId);
    if (!activityToDelete) return;

    try {
      const activityRef = doc(db, "trips", TRIP_ID, "activities", activityId);
      await deleteDoc(activityRef);
      toast({
        title: "Actividad Eliminada",
        description: `"${activityToDelete.title}" ha sido eliminada de la base de datos.`,
      });
      fetchActivities(); 
    } catch (error) {
      console.error("Error deleting activity:", error);
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: `No se pudo eliminar "${activityToDelete.title}".`,
      });
    }
  };


  if (showFullItinerary) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <main className="flex-grow container mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
          <TripHeader
            tripName={`Viaje Familia ${initialStaticTripData.familia}`}
            startDate={initialStaticTripData.inicio}
            endDate={initialStaticTripData.fin}
            onViewFullItinerary={() => setShowFullItinerary(true)}
            isDashboard={false}
            onReturnToDashboard={() => setShowFullItinerary(false)}
          />
          {isLoadingActivities ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Cargando itinerario...</p>
            </div>
          ) : (
            <ItinerarySection
              initialTripData={currentTripDataForWidgets} 
              activities={activities} 
              onAddOrUpdateActivity={handleAddOrUpdateActivity}
              onSetActivities={handleSetActivitiesBatchUpdate}
              onDeleteActivity={handleDeleteActivityInternal}
            />
          )}
          <Separator className="my-8 md:my-12" />
          <CalendarSection tripData={currentTripDataForWidgets} />
          <Separator className="my-8 md:my-12" />
          <MapSection tripData={currentTripDataForWidgets} />
          <Separator className="my-8 md:my-12" />
          <BudgetSection initialTripData={currentTripDataForWidgets} />
        </main>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-8 space-y-8">
      <TripHeader
        tripName={`Viaje Familia ${initialStaticTripData.familia}`}
        startDate={initialStaticTripData.inicio}
        endDate={initialStaticTripData.fin}
        onViewFullItinerary={() => setShowFullItinerary(true)}
        isDashboard={true}
      />
      {isLoadingActivities ? (
        <div className="flex justify-center items-center py-10">
           <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <TodayView
              tripData={currentTripDataForWidgets}
              onAddActivity={handleAddOrUpdateActivity}
              currentCityForToday={currentCityToday}
              currentDate={currentDate}
            />
          </div>
          <div className="space-y-6">
            <UpcomingMilestone tripData={currentTripDataForWidgets} currentDate={currentDate} />
            <BudgetSnapshot expenses={currentTripDataForWidgets.expenses} currentCity={currentCityToday} />
            <QuickActions 
                onViewFullItinerary={() => setShowFullItinerary(true)} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
