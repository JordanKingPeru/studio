"use client";

import type { Activity, ItineraryDay, TripDetails } from '@/lib/types';
import ActivityCard from './ActivityCard';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Plane,Briefcase } from 'lucide-react';

interface ActivityListProps {
  activities: Activity[];
  tripData: TripDetails;
  onEditActivity: (activity: Activity) => void;
  onDeleteActivity: (activityId: string) => void;
}

const groupActivitiesByDay = (activities: Activity[], tripData: TripDetails): ItineraryDay[] => {
  const grouped: Record<string, ItineraryDay> = {};
  const tripStartDate = parseISO(tripData.inicio);
  const tripEndDate = parseISO(tripData.fin);
  const totalDays = differenceInDays(tripEndDate, tripStartDate) + 1;

  for (let i = 0; i < totalDays; i++) {
    const currentDate = addDays(tripStartDate, i);
    const dateStr = format(currentDate, 'yyyy-MM-dd'); // Corrected DD to dd
    
    const currentCity = tripData.ciudades.find(c => 
        parseISO(c.arrivalDate) <= currentDate && parseISO(c.departureDate) >= currentDate
    );

    const cityInfo = currentCity ? `${currentCity.name}, ${currentCity.country}` : 'En tránsito / Sin ciudad asignada';
    
    // Check if it's a travel day (departure from one city or arrival to another)
    const isTravelDay = tripData.ciudades.some(c => c.arrivalDate === dateStr || c.departureDate === dateStr);
    
    // Check if it's a work day
    const isWorkDay = tripData.trabajo_ini && tripData.trabajo_fin &&
                      parseISO(tripData.trabajo_ini) <= currentDate &&
                      parseISO(tripData.trabajo_fin) >= currentDate;

    grouped[dateStr] = {
      date: dateStr,
      cityInfo,
      activities: [],
      isWorkDay: !!isWorkDay,
      isTravelDay: !!isTravelDay,
    };
  }
  
  activities.sort((a, b) => a.time.localeCompare(b.time)).forEach(activity => {
    if (grouped[activity.date]) {
      grouped[activity.date].activities.push(activity);
    } else {
      // This case should ideally not happen if all dates are pre-initialized
      // but as a fallback:
      const activityDate = parseISO(activity.date);
      const currentCity = tripData.ciudades.find(c => 
        parseISO(c.arrivalDate) <= activityDate && parseISO(c.departureDate) >= activityDate
      );
      const cityInfo = currentCity ? `${currentCity.name}, ${currentCity.country}` : 'En tránsito / Sin ciudad asignada';
      const isWorkDay = tripData.trabajo_ini && tripData.trabajo_fin &&
                      parseISO(tripData.trabajo_ini) <= activityDate &&
                      parseISO(tripData.trabajo_fin) >= activityDate;

      grouped[activity.date] = {
        date: activity.date,
        cityInfo,
        activities: [activity],
        isWorkDay: !!isWorkDay,
        isTravelDay: false, // Cannot reliably determine this for out-of-range dates
      };
    }
  });
  
  return Object.values(grouped).sort((a,b) => a.date.localeCompare(b.date));
};


export default function ActivityList({ activities, tripData, onEditActivity, onDeleteActivity }: ActivityListProps) {
  const dailyItinerary = groupActivitiesByDay(activities, tripData);

  if (dailyItinerary.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No hay actividades planificadas todavía.</p>;
  }

  return (
    <div className="space-y-8">
      {dailyItinerary.map((day) => (
        <Card key={day.date} className="rounded-2xl shadow-lg overflow-hidden">
          <CardHeader className="bg-muted/50">
            <CardTitle className="font-headline text-2xl text-primary flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <span className="flex items-center">
                <CalendarDays size={24} className="mr-3" />
                {format(parseISO(day.date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
              </span>
              <div className="text-sm font-normal text-muted-foreground mt-1 sm:mt-0 flex items-center gap-2">
                {day.isTravelDay && <Plane size={16} className="text-accent" />}
                {day.isWorkDay && <Briefcase size={16} className="text-secondary-foreground" />}
                <span>{day.cityInfo}</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {day.activities.length > 0 ? (
              day.activities.map(activity => (
                <ActivityCard 
                  key={activity.id} 
                  activity={activity} 
                  onEdit={onEditActivity}
                  onDelete={onDeleteActivity}
                />
              ))
            ) : (
              <p className="text-muted-foreground py-4">Día libre o sin actividades específicas.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
