
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { TripDetails, Activity, City, Expense } from '@/lib/types';
import type { CityFormData } from '@/components/map/AddCityDialog';
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
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch, serverTimestamp, query, orderBy as firestoreOrderBy, addDoc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';

interface DashboardViewProps {
  tripId: string; // Now receives tripId as a prop
  initialTripData: TripDetails; // Pre-fetched data for the specific trip
}

export default function DashboardView({ tripId, initialTripData }: DashboardViewProps) {
  const [activities, setActivities] = useState<Activity[]>(initialTripData.activities || []);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [cities, setCities] = useState<City[]>(initialTripData.ciudades || []);
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
    if (!tripId) return;
    setIsLoadingActivities(true);
    try {
      const activitiesCollectionRef = collection(db, "trips", tripId, "activities");
      const q = query(activitiesCollectionRef, firestoreOrderBy("date"), firestoreOrderBy("order"), firestoreOrderBy("time"));
      const querySnapshot = await getDocs(q);
      const fetchedActivities: Activity[] = [];
      querySnapshot.forEach((doc) => {
        fetchedActivities.push({ id: doc.id, ...doc.data(), tripId } as Activity);
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
  }, [toast, tripId]);

  const fetchCities = useCallback(async () => {
    if (!tripId) return;
    setIsLoadingCities(true);
    try {
      const citiesCollectionRef = collection(db, "trips", tripId, "cities");
      const q = query(citiesCollectionRef, firestoreOrderBy("arrivalDate"));
      const querySnapshot = await getDocs(q);
      const fetchedCities: City[] = [];
      querySnapshot.forEach((doc) => {
        fetchedCities.push({ id: doc.id, ...doc.data(), tripId } as City);
      });
      if (fetchedCities.length > 0) {
        setCities(fetchedCities);
      } else {
        setCities(initialTripData.ciudades || []); // Fallback to initial if Firestore is empty
      }
    } catch (error: any) {
      console.error("Error fetching cities:", error);
      toast({
        variant: "destructive",
        title: "Error al cargar ciudades",
        description: `No se pudieron cargar las ciudades. ${error.message}`,
      });
      setCities(initialTripData.ciudades || []); // Fallback on error
    } finally {
      setIsLoadingCities(false);
    }
  }, [toast, tripId, initialTripData.ciudades]);

  useEffect(() => {
    // Data is initially passed via initialTripData,
    // then Firestore fetches can update it.
    // If initialTripData.activities is already populated, use it to avoid initial flash of empty.
    if (initialTripData.activities && initialTripData.activities.length > 0) {
      setActivities(initialTripData.activities);
      setIsLoadingActivities(false); // Assume initial data is good enough to show
    } else {
      fetchActivities(); // Fetch if initial data is sparse
    }

    if (initialTripData.ciudades && initialTripData.ciudades.length > 0) {
      setCities(initialTripData.ciudades);
      setIsLoadingCities(false);
    } else {
      fetchCities();
    }
  }, [fetchActivities, fetchCities, initialTripData.activities, initialTripData.ciudades, tripId]);


  const derivedExpensesFromActivities = useMemo((): Expense[] => {
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

  // This is the data passed to child components. It uses the dynamic activities/cities states.
  const currentDisplayTripData = useMemo((): TripDetails => ({
    ...initialTripData, // Base trip info (name, dates, etc.)
    id: tripId, // Ensure current tripId from prop
    activities: activities, // Dynamic activities state
    ciudades: cities, // Dynamic cities state
    expenses: derivedExpensesFromActivities, // Dynamically derived expenses
  }), [initialTripData, tripId, activities, cities, derivedExpensesFromActivities]);


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
    if (!tripId) return;
    const activityId = activity.id && !activity.id.startsWith('temp-') ? activity.id : doc(collection(db, "trips", tripId, "activities")).id;
    const activityRef = doc(db, "trips", tripId, "activities", activityId);
    
    // Ensure tripId is part of the activity data
    const activityDataForFirestore: Record<string, any> = { ...activity, id: activityId, tripId };
    delete (activityDataForFirestore as any).initialTripData; // Remove any extraneous props

    // Clean up undefined fields before sending to Firestore
     for (const key in activityDataForFirestore) {
      if (Object.prototype.hasOwnProperty.call(activityDataForFirestore, key)) {
        if (activityDataForFirestore[key] === undefined) {
          delete activityDataForFirestore[key];
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
      fetchActivities(); // Re-fetch to update list
    } catch (error) {
      console.error("Error saving activity:", error);
      toast({
        variant: "destructive",
        title: "Error al guardar actividad",
        description: `No se pudo guardar la actividad. Error: ${(error as Error).message}`,
      });
      throw error;
    }
  };

  const handleSetActivitiesBatchUpdate = async (updatedActivities: Activity[]) => {
    if (!tripId) return;
    const batch = writeBatch(db);
    updatedActivities.forEach(activity => {
      if (activity.id && !activity.id.startsWith('temp-')) {
        const activityRef = doc(db, "trips", tripId, "activities", activity.id);
        // Ensure tripId is part of the update payload if it wasn't there
        const updatePayload: Partial<Activity> = { ...activity, tripId };
        
        const sanitizedPayload: Record<string, any> = {};
        for (const key in updatePayload) {
            if (Object.prototype.hasOwnProperty.call(updatePayload, key)) {
                const typedKey = key as keyof Activity;
                if (updatePayload[typedKey] !== undefined && typedKey !== 'id' && typedKey !== 'initialTripData') { // Don't write id back, or extraneous props
                    sanitizedPayload[typedKey] = updatePayload[typedKey];
                }
            }
        }
        sanitizedPayload.updatedAt = serverTimestamp();

        if (Object.keys(sanitizedPayload).length > 1) { // More than just updatedAt
            batch.update(activityRef, sanitizedPayload);
        }
      }
    });

    try {
      await batch.commit();
      // Optimistically update local state or re-fetch
      fetchActivities();
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
    if (!tripId) return;
    const activityToDelete = activities.find(a => a.id === activityId);
    if (!activityToDelete) return;

    try {
      const activityRef = doc(db, "trips", tripId, "activities", activityId);
      await deleteDoc(activityRef);
      toast({
        title: "Actividad Eliminada",
        description: `"${activityToDelete.title}" ha sido eliminada.`,
      });
      fetchActivities(); // Re-fetch
    } catch (error) {
      console.error("Error deleting activity:", error);
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: `No se pudo eliminar "${activityToDelete.title}".`,
      });
    }
  };

  const handleSaveCity = async (cityData: CityFormData) => {
    if (!tripId) return;
    const { id, lat, lng, ...dataToSave } = cityData;
    const cityObjectForFirestore: Omit<City, 'id'> = {
      ...dataToSave,
      tripId: tripId, // Ensure tripId is included
      coordinates: { lat, lng },
    };

    try {
      if (id) { 
        const cityRef = doc(db, "trips", tripId, "cities", id);
        await setDoc(cityRef, cityObjectForFirestore, { merge: true });
        toast({
          title: "Ciudad Actualizada",
          description: `"${cityData.name}" ha sido actualizada.`,
        });
      } else { 
        const citiesCollectionRef = collection(db, "trips", tripId, "cities");
        await addDoc(citiesCollectionRef, cityObjectForFirestore);
        toast({
          title: "Ciudad Añadida",
          description: `"${cityData.name}" ha sido añadida.`,
        });
      }
      fetchCities(); 
    } catch (error: any) {
      console.error("Error saving city:", error);
      toast({
        variant: "destructive",
        title: "Error al Guardar Ciudad",
        description: `No se pudo guardar la ciudad. ${error.message}`,
      });
      throw error; 
    }
  };

  const handleDeleteCity = async (cityId: string) => {
    if (!tripId) return;
    const cityToDelete = cities.find(c => c.id === cityId);
    if (!cityToDelete) return;

    try {
      const cityRef = doc(db, "trips", tripId, "cities", cityId);
      await deleteDoc(cityRef);
      toast({
        title: "Ciudad Eliminada",
        description: `"${cityToDelete.name}" ha sido eliminada.`,
      });
      fetchCities(); 
    } catch (error: any) {
      console.error("Error deleting city:", error);
      toast({
        variant: "destructive",
        title: "Error al Eliminar Ciudad",
        description: `No se pudo eliminar "${cityToDelete.name}". ${error.message}`,
      });
    }
  };

  const isLoading = isLoadingActivities || isLoadingCities; 

  if (showFullItinerary) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <main className="flex-grow container mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
          <TripHeader
            tripName={currentDisplayTripData.name || `Viaje Familia ${currentDisplayTripData.familia}`}
            startDate={currentDisplayTripData.startDate}
            endDate={currentDisplayTripData.endDate}
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
              tripData={currentDisplayTripData} // Pass the full current trip data
              activities={activities} // Pass current activities list
              onAddOrUpdateActivity={handleAddOrUpdateActivity}
              onSetActivities={handleSetActivitiesBatchUpdate}
              onDeleteActivity={handleDeleteActivityInternal}
              tripId={tripId} // Pass tripId
            />
          )}
          <Separator className="my-8 md:my-12" />
          <CalendarSection tripData={currentDisplayTripData} tripId={tripId} />
          <Separator className="my-8 md:my-12" />
          {isLoadingCities ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Cargando mapa y ciudades...</p>
            </div>
          ) : (
            <MapSection 
              tripData={currentDisplayTripData} 
              cities={cities} // Pass current cities list
              onSaveCity={handleSaveCity}
              onDeleteCity={handleDeleteCity}
              tripId={tripId} // Pass tripId
            />
          )}
          <Separator className="my-8 md:my-12" />
          {isLoadingActivities ? ( 
             <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Cargando presupuesto...</p>
            </div>
          ) : (
            <BudgetSection 
                expenses={derivedExpensesFromActivities} 
                tripCities={cities}  // Pass current cities list
                tripId={tripId} // Pass tripId
            />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-8 space-y-8">
      <TripHeader
        tripName={currentDisplayTripData.name || `Viaje Familia ${currentDisplayTripData.familia}`}
        startDate={currentDisplayTripData.startDate}
        endDate={currentDisplayTripData.endDate}
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
              tripData={currentDisplayTripData} // Pass full current trip data
              onAddActivity={handleAddOrUpdateActivity}
              currentCityForToday={currentCityToday}
              currentDate={currentDate}
              tripId={tripId} // Pass tripId
            />
          </div>
          <div className="space-y-6">
            <UpcomingMilestone tripData={currentDisplayTripData} currentDate={currentDate} tripId={tripId}/>
            <BudgetSnapshot expenses={derivedExpensesFromActivities} currentCity={currentCityToday} tripId={tripId} />
            <QuickActions
                onViewFullItinerary={() => setShowFullItinerary(true)}
                tripId={tripId}
            />
          </div>
        </div>
      )}
    </div>
  );
}
