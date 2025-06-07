import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ItinerarySection from '@/components/itinerary/ItinerarySection';
import CalendarSection from '@/components/calendar/CalendarSection';
import MapSection from '@/components/map/MapSection';
import BudgetSection from '@/components/budget/BudgetSection';
import { viaje } from '@/lib/constants';
import type { TripDetails } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

export default function HomePage() {
  // Normally, this data would come from a database or state management.
  // For this example, we use the constant `viaje`.
  const tripData: TripDetails = viaje;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
        <div className="py-8 md:py-12">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-headline font-bold text-center text-primary mb-4">
              Planificador de Viaje Familiar
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground text-center max-w-3xl mx-auto">
              Organiza cada detalle de tus próximas vacaciones en familia. Desde el itinerario diario hasta el presupuesto, todo en un solo lugar.
            </p>
        </div>

        <ItinerarySection initialTripData={tripData} />
        <Separator className="my-8 md:my-12" />
        <CalendarSection tripData={tripData} />
        <Separator className="my-8 md:my-12" />
        <MapSection tripData={tripData} />
        <Separator className="my-8 md:my-12" />
        <BudgetSection initialTripData={tripData} />
      </main>
      <Footer />
    </div>
  );
}
