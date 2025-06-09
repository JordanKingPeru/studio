
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { TripDetails, Activity, City, Expense, Coordinates } from '@/lib/types'; // Added Coordinates
import TripHeader from './TripHeader';
import ItinerarySection from '@/components/itinerary/ItinerarySection';
import CalendarSection from '@/components/calendar/CalendarSection';
import MapSection from '@/components/map/MapSection';
// import type { CityFormData } from '@/components/map/AddCityDialog'; // No longer needed here directly for the shell
import BudgetSection from '@/components/budget/BudgetSection';
import { Separator } from '@/components/ui/separator';
import TodayView from './TodayView';
import UpcomingMilestone from './UpcomingMilestone';
import BudgetSnapshot from './BudgetSnapshot';
import QuickActions from './QuickActions';
import { parseISO, isWithinInterval } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch, serverTimestamp, query, orderBy as firestoreOrderBy, addDoc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';


interface DashboardViewProps {
  tripData: TripDetails; 
}

const TRIP_ID = "defaultTrip";

export default function DashboardView({ tripData: initialStaticTripData }: DashboardViewProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [cities, setCities] = useState<City[]>(initialStaticTripData.ciudades); 
  const [isLoadingCities, setIsLoadingCities] = useState(true);
  const [showFullItinerary, setShowFullItinerary] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
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
    } catch (error: any) {
      console.error("Error fetching activities:", error);
      toast({
        variant: "destructive",
        title: "Error al cargar actividades",
        description: `No se pudieron cargar las actividades. ${error.message}`,
      });
    } finally {
      setIsLoadingActivities(false);
    }
  }, [toast]);

  const fetchCities = useCallback(async () => {
    setIsLoadingCities(true);
    try {
      const citiesCollectionRef = collection(db, "trips", TRIP_ID, "cities");
      const q = query(citiesCollectionRef, firestoreOrderBy("arrivalDate"));
      const querySnapshot = await getDocs(q);
      const fetchedCities: City[] = [];
      querySnapshot.forEach((doc) => {
        fetchedCities.push({ id: doc.id, ...doc.data() } as City);
      });
      if (fetchedCities.length > 0) {
        setCities(fetchedCities);
      } else {
        // If Firestore is empty, use static data as a fallback for display
        setCities(initialStaticTripData.ciudades); 
      }
    } catch (error: any) {
      console.error("Error fetching cities:", error);
      toast({
        variant: "destructive",
        title: "Error al cargar ciudades",
        description: `No se pudieron cargar las ciudades. ${error.message}`,
      });
      setCities(initialStaticTripData.ciudades); // Fallback to static if fetch fails
    } finally {
      setIsLoadingCities(false);
    }
  }, [toast, initialStaticTripData.ciudades]);

  useEffect(() => {
    fetchActivities();
    fetchCities();
  }, [fetchActivities, fetchCities]);

  const derivedExpensesFromActivities = useMemo((): Expense[] => {
    return activities
      .filter(activity => typeof activity.cost === 'number' && activity.cost > 0)
      .map(activity => ({
        id: `${activity.id}-expense`, 
        city: activity.city,
        date: activity.date,
        category: activity.category,
        description: activity.title, 
        amount: Number(activity.cost || 0), 
      }));
  }, [activities]);

  const currentTripDataForWidgets = useMemo((): TripDetails => ({
    ...initialStaticTripData,
    activities: activities,
    ciudades: cities, 
    expenses: derivedExpensesFromActivities,
  }), [initialStaticTripData, activities, cities, derivedExpensesFromActivities]);


  const currentCityToday = useMemo((): City | undefined => {
    if (!currentDate || !cities) return undefined; 
    const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    return cities.find(city => { 
      const arrival = parseISO(city.arrivalDate);
      const departure = parseISO(city.departureDate);
      return isWithinInterval(currentDateOnly, { start: arrival, end: departure });
    });
  }, [currentDate, cities]); 

  const handleAddOrUpdateActivity = async (activity: Activity) => {
    const activityId = activity.id && !activity.id.startsWith('temp-') ? activity.id : doc(collection(db, "trips", TRIP_ID, "activities")).id;
    const activityRef = doc(db, "trips", TRIP_ID, "activities", activityId);
    const activityDataForFirestore: Record<string, any> = {};

    const activityBaseData: Partial<Activity> = { ...activity, id: activityId};
     for (const key in activityBaseData) {
      if (Object.prototype.hasOwnProperty.call(activityBaseData, key)) {
        const typedKey = key as keyof Activity;
        if (activityBaseData[typedKey] !== undefined) {
          activityDataForFirestore[typedKey] = activityBaseData[typedKey];
        }
      }
    }
    
    activityDataForFirestore.updatedAt = serverTimestamp();
    if (!activities.find(a => a.id === activityId)) {
        activityDataForFirestore.createdAt = serverTimestamp();
    }

    try {
      await setDoc(activityRef, activityDataForFirestore, { merge: true });
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
      throw error;
    }
  };

  const handleSetActivitiesBatchUpdate = async (updatedActivities: Activity[]) => {
    const batch = writeBatch(db);
    updatedActivities.forEach(activity => {
      if (activity.id && !activity.id.startsWith('temp-')) {
        const activityRef = doc(db, "trips", TRIP_ID, "activities", activity.id);
        const updatePayload: Partial<Activity> = {
          order: activity.order,
          time: activity.time,
          date: activity.date,
          city: activity.city,
          cost: activity.cost,
          notes: activity.notes,
          attachments: activity.attachments,
        };
        
        const sanitizedPayload: Record<string, any> = {};
        for (const key in updatePayload) {
            if (Object.prototype.hasOwnProperty.call(updatePayload, key)) {
                const typedKey = key as keyof Activity;
                if (updatePayload[typedKey] !== undefined) {
                    sanitizedPayload[typedKey] = updatePayload[typedKey];
                }
            }
        }
        sanitizedPayload.updatedAt = serverTimestamp();

        if (Object.keys(sanitizedPayload).length > 1) { 
            batch.update(activityRef, sanitizedPayload);
        }
      }
    });

    try {
      await batch.commit();
      setActivities(prevActivities => {
        return prevActivities.map(pa => {
          const updatedVersion = updatedActivities.find(ua => ua.id === pa.id);
          return updatedVersion ? { ...pa, ...updatedVersion } : pa;
        }).sort((a,b) => {
            const dateComparison = a.date.localeCompare(b.date);
            if (dateComparison !== 0) return dateComparison;
            const timeComparison = a.time.localeCompare(b.time);
            if (timeComparison !== 0) return timeComparison;
            return (a.order ?? 0) - (b.order ?? 0);
        });
      });
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

  // Placeholder for handleSaveCity and handleDeleteCity if MapSection shell doesn't need them
  // const handleSaveCity = async (cityData: CityFormData) => { ... }
  // const handleDeleteCity = async (cityId: string) => { ... }

  const isLoading = isLoadingActivities || isLoadingCities; 

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
          {isLoadingCities ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Cargando mapa y ciudades...</p>
            </div>
          ) : (
            <MapSection 
              tripData={currentTripDataForWidgets} 
              // cities={cities} // No longer passing cities to the shell
              // onSaveCity={handleSaveCity} // No longer passing save handler to the shell
              // onDeleteCity={handleDeleteCity} // No longer passing delete handler to the shell
            />
          )}
          <Separator className="my-8 md:my-12" />
          {isLoadingActivities ? ( 
             <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Cargando presupuesto...</p>
            </div>
          ) : (
            <BudgetSection expenses={derivedExpensesFromActivities} tripCities={cities} />
          )}
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
      {isLoading ? (
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
            <BudgetSnapshot expenses={derivedExpensesFromActivities} currentCity={currentCityToday} />
            <QuickActions
                onViewFullItinerary={() => setShowFullItinerary(true)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
