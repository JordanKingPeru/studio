
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { TripDetails, Activity, City } from '@/lib/types'; 
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

interface DashboardViewProps {
  tripData: TripDetails;
}

export default function DashboardView({ tripData: initialTripData }: DashboardViewProps) {
  const [currentTripData, setCurrentTripData] = useState<TripDetails>(initialTripData);
  const [showFullItinerary, setShowFullItinerary] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentDate(new Date());
    const timer = setInterval(() => setCurrentDate(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setCurrentTripData(initialTripData);
  }, [initialTripData]);

  const currentCityToday = useMemo((): City | undefined => {
    if (!currentDate || !currentTripData.ciudades) return undefined;
    
    const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

    return currentTripData.ciudades.find(city => {
      const arrival = parseISO(city.arrivalDate);
      const departure = parseISO(city.departureDate);
      return isWithinInterval(currentDateOnly, { start: arrival, end: departure });
    });
  }, [currentDate, currentTripData.ciudades]);


  const handleAddActivity = (newActivity: Activity) => {
    setCurrentTripData(prevTripData => {
      const updatedActivities = [...prevTripData.activities, newActivity].sort((a, b) => {
        const dateComparison = a.date.localeCompare(b.date);
        if (dateComparison !== 0) return dateComparison;
        const timeComparison = a.time.localeCompare(b.time);
        if (timeComparison !== 0) return timeComparison;
        return (a.order ?? Date.now()) - (b.order ?? Date.now());
      });
      return { ...prevTripData, activities: updatedActivities };
    });
  };
  
  const handleSetActivities = (updatedActivities: Activity[]) => {
     const sortedActivities = [...updatedActivities].sort((a, b) => {
        const dateComparison = a.date.localeCompare(b.date);
        if (dateComparison !== 0) return dateComparison;
        const timeComparison = a.time.localeCompare(b.time);
        if (timeComparison !== 0) return timeComparison;
        return (a.order ?? Date.now()) - (b.order ?? Date.now());
      });
    setCurrentTripData(prevTripData => ({
      ...prevTripData,
      activities: sortedActivities,
    }));
  };


  if (showFullItinerary) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <main className="flex-grow container mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
          <TripHeader
            tripName={currentTripData.familia} 
            startDate={currentTripData.inicio}
            endDate={currentTripData.fin}
            onViewFullItinerary={() => setShowFullItinerary(true)} 
            isDashboard={false}
            onReturnToDashboard={() => setShowFullItinerary(false)}
          />
          <ItinerarySection 
            initialTripData={currentTripData}
            activities={currentTripData.activities}
            onSetActivities={handleSetActivities} 
          />
          <Separator className="my-8 md:my-12" />
          <CalendarSection tripData={currentTripData} />
          <Separator className="my-8 md:my-12" />
          <MapSection tripData={currentTripData} />
          <Separator className="my-8 md:my-12" />
          <BudgetSection initialTripData={currentTripData} />
        </main>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-8 space-y-8">
      <TripHeader
        tripName={`Viaje Familia ${currentTripData.familia}`}
        startDate={currentTripData.inicio}
        endDate={currentTripData.fin}
        onViewFullItinerary={() => setShowFullItinerary(true)}
        isDashboard={true}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <TodayView 
            tripData={currentTripData} 
            onAddActivity={handleAddActivity} 
            currentCityForToday={currentCityToday}
            currentDate={currentDate}
          />
        </div>
        <div className="space-y-6">
          <UpcomingMilestone tripData={currentTripData} currentDate={currentDate} />
          <BudgetSnapshot expenses={currentTripData.expenses} currentCity={currentCityToday} />
          <QuickActions onViewFullItinerary={() => setShowFullItinerary(true)} />
        </div>
      </div>
    </div>
  );
}
