
"use client";

import type { TripDetails, Activity, City } from '@/lib/types';
import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import ActivitySummaryCard from './ActivitySummaryCard';
import AISuggestionButton from '@/components/ai/AISuggestionButton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CalendarDays, Loader2 } from 'lucide-react';

interface TodayViewProps {
  tripData: TripDetails;
  onAddActivity: (activity: Activity) => Promise<void>; // Changed from void to Promise<void>
  currentCityForToday: City | undefined;
  currentDate: Date | null;
  tripId: string; // Added tripId
}

export default function TodayView({ tripData, onAddActivity, currentCityForToday, currentDate, tripId }: TodayViewProps) {

  const todayString = useMemo(() => {
    if (!currentDate) return '';
    return format(currentDate, 'yyyy-MM-dd');
  }, [currentDate]);

  const formattedToday = useMemo(() => {
    if (!currentDate) return 'Cargando fecha...';
    return format(currentDate, "EEEE, d 'de' MMMM", { locale: es });
  }, [currentDate]);

  const todaysActivities = useMemo(() => {
    if (!currentDate || !tripData.activities) return []; 
    return tripData.activities
      .filter(act => act.tripId === tripId && act.date === todayString) // Filter by tripId
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [tripData.activities, todayString, currentDate, tripId]);

  const displayCityName = currentCityForToday?.name || "Destino";

  if (!currentDate) {
    return (
      <Card className="rounded-xl shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary flex items-center">
            <CalendarDays size={22} className="mr-2" />
            Cargando vista de hoy...
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  // Ensure cities being passed to AISuggestionButton are filtered for the current trip
  const currentTripCities = tripData.ciudades.filter(c => c.tripId === tripId);

  return (
    <Card className="rounded-xl shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl text-primary flex items-center">
          <CalendarDays size={22} className="mr-2" />
          Hoy en {displayCityName}
        </CardTitle>
        <CardDescription>{formattedToday}</CardDescription>
      </CardHeader>
      <CardContent>
        {todaysActivities.length > 0 ? (
          <div className="space-y-2">
            {todaysActivities.map(activity => (
              <ActivitySummaryCard key={activity.id} activity={activity} />
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-lg text-muted-foreground mb-4">
              Día libre. ¿Qué te apetece hacer hoy? 🏖️
            </p>
            <AISuggestionButton
              cities={currentTripCities} // Pass filtered cities
              tripFamilia={tripData.familia || tripData.name} // Use trip name or familia
              tripDates={{ inicio: tripData.startDate, fin: tripData.endDate }}
              onAddActivity={onAddActivity}
              tripId={tripId} // Pass tripId
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
