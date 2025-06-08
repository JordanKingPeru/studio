
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import DashboardView from '@/components/dashboard/DashboardView';
import { viaje } from '@/lib/constants';
import type { TripDetails } from '@/lib/types';

export default function HomePage() {
  const tripData: TripDetails = viaje;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow">
        {/* 
          The main title and intro paragraph have been moved to DashboardView or TripHeader 
          to be contextually part of the dashboard or the full itinerary view.
        */}
        <DashboardView tripData={tripData} />
      </main>
      <Footer />
    </div>
  );
}
