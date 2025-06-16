
"use client";

import type { TripDetails, Activity, City } from '@/lib/types';
import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import ActivitySummaryCard from './ActivitySummaryCard';
import AISuggestionButton from '@/components/ai/AISuggestionButton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CalendarDays, Loader2, Lightbulb } from 'lucide-react'; // Added Lightbulb
import { Button } from '@/components/ui/button';

interface TodayViewProps {
  tripData: TripDetails;
  onAddActivity: (activity: Activity) => Promise<void>;
  currentCityForToday: City | undefined;
  currentDate: Date | null;
  tripId: string;
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
      .filter(act => act.tripId === tripId && act.date === todayString)
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
  
  const currentTripCities = tripData.ciudades.filter(c => c.tripId === tripId);

  // Simulated proactive AI suggestion for free day
  const freeDaySuggestion = {
    activity: "Paseo por el Parque del Retiro y visita al Palacio de Cristal",
    reason: "Una actividad relajante y cultural, perfecta para un día soleado en Madrid.",
    category: "Ocio",
    time: "11:00"
  };

  const handleAddSimulatedSuggestion = () => {
    if (!currentDate) return;
    const newActivity: Activity = {
      id: `ai-sugg-${Date.now()}`,
      tripId: tripId,
      date: todayString,
      time: freeDaySuggestion.time,
      title: freeDaySuggestion.activity,
      category: freeDaySuggestion.category as Activity["category"],
      notes: freeDaySuggestion.reason,
      city: currentCityForToday?.name || "N/A",
      order: Date.now(),
      attachments: [],
    };
    onAddActivity(newActivity);
  };

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
          <div className="text-center py-6 space-y-4">
            <p className="text-lg text-muted-foreground">
              Día libre. ¿Qué te apetece hacer hoy? 🏖️
            </p>
            
            {/* Simulated Proactive AI Suggestion */}
            <Card className="bg-accent/10 border-accent/30 rounded-lg p-4 text-left shadow-sm">
              <div className="flex items-start space-x-3">
                <Lightbulb className="h-6 w-6 text-accent shrink-0 mt-1" />
                <div>
                  <p className="text-sm font-semibold text-accent-foreground">Sugerencia IA (Simulada):</p>
                  <p className="text-sm text-foreground mt-0.5">{freeDaySuggestion.activity}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{freeDaySuggestion.reason}</p>
                  <Button size="sm" variant="outline" className="mt-2 text-xs" onClick={handleAddSimulatedSuggestion}>
                    Añadir al Itinerario
                  </Button>
                </div>
              </div>
            </Card>
            
            <AISuggestionButton
              cities={currentTripCities}
              tripFamilia={tripData.familia || tripData.name}
              tripDates={{ inicio: tripData.startDate, fin: tripData.endDate }}
              onAddActivity={onAddActivity}
              tripId={tripId}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
