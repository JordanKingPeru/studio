
"use client";

import { useState } from 'react';
import type { TripDetails } from '@/lib/types';
import TripHeader from './TripHeader';
import ItinerarySection from '@/components/itinerary/ItinerarySection';
import CalendarSection from '@/components/calendar/CalendarSection';
import MapSection from '@/components/map/MapSection';
import BudgetSection from '@/components/budget/BudgetSection';
import { Separator } from '@/components/ui/separator';
// Import other dashboard widgets here as they are created
// import TodayView from './TodayView';
// import UpcomingMilestone from './UpcomingMilestone';
// import BudgetSnapshot from './BudgetSnapshot';
// import QuickActions from './QuickActions';

interface DashboardViewProps {
  tripData: TripDetails;
}

export default function DashboardView({ tripData }: DashboardViewProps) {
  const [showFullItinerary, setShowFullItinerary] = useState(false);

  if (showFullItinerary) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <main className="flex-grow container mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
          <TripHeader
            tripName={tripData.familia} // Assuming trip name is family for now
            startDate={tripData.inicio}
            endDate={tripData.fin}
            onViewFullItinerary={() => setShowFullItinerary(true)} // Stays in full view
            isDashboard={false}
          />
          <ItinerarySection initialTripData={tripData} />
          <Separator className="my-8 md:my-12" />
          <CalendarSection tripData={tripData} />
          <Separator className="my-8 md:my-12" />
          <MapSection tripData={tripData} />
          <Separator className="my-8 md:my-12" />
          <BudgetSection initialTripData={tripData} />
        </main>
      </div>
    );
  }

  // TODO: Implement loading state with skeletons
  // if (isLoading) {
  //   return <DashboardSkeleton />;
  // }

  // TODO: Implement empty state
  // if (!tripData.activities || tripData.activities.length === 0) {
  //   return <EmptyDashboardState />;
  // }

  return (
    <div className="container mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-8 space-y-8">
      <TripHeader
        tripName={`Viaje Familia ${tripData.familia}`}
        startDate={tripData.inicio}
        endDate={tripData.fin}
        onViewFullItinerary={() => setShowFullItinerary(true)}
        isDashboard={true}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* <TodayView tripData={tripData} /> */}
          <p className="p-4 bg-muted/30 rounded-xl shadow-inner text-center text-muted-foreground">
            Widget 'TodayView' (Actividades de Hoy) se implementará aquí.
          </p>
        </div>
        <div className="space-y-6">
          {/* <UpcomingMilestone tripData={tripData} /> */}
          <p className="p-4 bg-muted/30 rounded-xl shadow-inner text-center text-muted-foreground">
            Widget 'UpcomingMilestone' (Próximo Hito) se implementará aquí.
          </p>
          {/* <BudgetSnapshot tripData={tripData} /> */}
          <p className="p-4 bg-muted/30 rounded-xl shadow-inner text-center text-muted-foreground">
            Widget 'BudgetSnapshot' (Resumen Presupuesto Ciudad Actual) se implementará aquí.
          </p>
          {/* <QuickActions tripData={tripData} /> */}
          <p className="p-4 bg-muted/30 rounded-xl shadow-inner text-center text-muted-foreground">
            Widget 'QuickActions' (Acciones Rápidas) se implementará aquí.
          </p>
        </div>
      </div>
    </div>
  );
}
