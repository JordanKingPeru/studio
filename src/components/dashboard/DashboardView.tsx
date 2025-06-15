
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { TripDetails, Activity, City, Expense } from '@/lib/types';
import type { CityFormData } from '@/components/map/AddCityDialog';
import TripHeader from './TripHeader';
// import ItinerarySection from '@/components/itinerary/ItinerarySection'; // No longer directly part of DashboardView
// import CalendarSection from '@/components/calendar/CalendarSection'; // No longer directly part of DashboardView
// import MapSection from '@/components/map/MapSection'; // No longer directly part of DashboardView
// import BudgetSection from '@/components/budget/BudgetSection'; // No longer directly part of DashboardView
// import { Separator } from '@/components/ui/separator'; // No longer directly part of DashboardView
import TodayView from './TodayView';
import UpcomingMilestone from './UpcomingMilestone';
import BudgetSnapshot from './BudgetSnapshot';
import QuickActions from './QuickActions';
import { parseISO, isWithinInterval } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch, serverTimestamp, query, orderBy as firestoreOrderBy, addDoc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation'; // For navigation from BudgetSnapshot

interface DashboardViewProps {
  tripId: string; 
  initialTripData: TripDetails; 
}

export default function DashboardView({ tripId, initialTripData }: DashboardViewProps) {
  const [activities, setActivities] = useState<Activity[]>(initialTripData.activities || []);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [cities, setCities] = useState<City[]>(initialTripData.ciudades || []);
  const [isLoadingCities, setIsLoadingCities] = useState(true);
  // const [showFullItinerary, setShowFullItinerary] = useState(false); // This state will be managed by navigation now
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const { toast } = useToast();
  const router = useRouter();

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
        setCities(initialTripData.ciudades || []); 
      }
    } catch (error: any) {
      console.error("Error fetching cities:", error);
      toast({
        variant: "destructive",
        title: "Error al cargar ciudades",
        description: `No se pudieron cargar las ciudades. ${error.message}`,
      });
      setCities(initialTripData.ciudades || []); 
    } finally {
      setIsLoadingCities(false);
    }
  }, [toast, tripId, initialTripData.ciudades]);

  useEffect(() => {
    if (initialTripData.activities && initialTripData.activities.length > 0) {
      setActivities(initialTripData.activities);
      setIsLoadingActivities(false); 
    } else {
      fetchActivities(); 
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

  const currentDisplayTripData = useMemo((): TripDetails => ({
    ...initialTripData, 
    id: tripId, 
    activities: activities, 
    ciudades: cities, 
    expenses: [...derivedExpensesFromActivities, ...(initialTripData.expenses?.filter(e => !e.id.includes('-expense')) || [])], // Combine derived with initial manual
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
    
    const activityDataForFirestore: Record<string, any> = { ...activity, id: activityId, tripId };
    delete (activityDataForFirestore as any).initialTripData; 

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
      fetchActivities(); 
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

  // Removed handleSetActivitiesBatchUpdate and handleDeleteActivityInternal as they are managed in ItineraryPage now
  // Removed handleSaveCity and handleDeleteCity as they are managed in MapPage now

  const isLoading = isLoadingActivities || isLoadingCities; 

  // The 'showFullItinerary' logic is removed. Navigation will handle showing different sections.
  // The DashboardView is now focused solely on displaying the dashboard content.

  return (
    <div className="container mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-8 space-y-8">
      <TripHeader
        tripName={currentDisplayTripData.name || `Viaje Familia ${currentDisplayTripData.familia}`}
        startDate={currentDisplayTripData.startDate}
        endDate={currentDisplayTripData.endDate}
        onViewFullItinerary={() => router.push(`/trips/${tripId}/itinerary`)} // Navigate to full itinerary
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
              tripData={currentDisplayTripData} 
              onAddActivity={handleAddOrUpdateActivity} // This might be an AI suggestion adding to today
              currentCityForToday={currentCityToday}
              currentDate={currentDate}
              tripId={tripId} 
            />
          </div>
          <div className="space-y-6">
            <UpcomingMilestone tripData={currentDisplayTripData} currentDate={currentDate} tripId={tripId}/>
            <BudgetSnapshot 
                expenses={currentDisplayTripData.expenses} // Pass all expenses
                currentCity={currentCityToday} 
                tripId={tripId} 
                onNavigateToBudget={() => router.push(`/trips/${tripId}/budget`)} // Prop for navigation
            />
            <QuickActions
                onViewFullItinerary={() => router.push(`/trips/${tripId}/itinerary`)}
                tripId={tripId}
            />
          </div>
        </div>
      )}
    </div>
  );
}
