
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
  onAddActivity: (activity: Activity) => void;
  currentCityForToday: City | undefined;
  currentDate: Date | null;
}

export default function TodayView({ tripData, onAddActivity, currentCityForToday, currentDate }: TodayViewProps) {

  const todayString = useMemo(() => {
    if (!currentDate) return '';
    return format(currentDate, 'yyyy-MM-dd');
  }, [currentDate]);

  const formattedToday = useMemo(() => {
    if (!currentDate) return 'Cargando fecha...';
    return format(currentDate, "EEEE, d 'de' MMMM", { locale: es });
  }, [currentDate]);

  const todaysActivities = useMemo(() => {
    if (!currentDate) return []; 
    return tripData.activities
      .filter(act => act.date === todayString)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [tripData.activities, todayString, currentDate]);

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
              cities={tripData.ciudades}
              tripFamilia={tripData.familia}
              tripDates={{ inicio: tripData.inicio, fin: tripData.fin }}
              onAddActivity={onAddActivity}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
