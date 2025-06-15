
"use client";

import type { TripDetails, Activity, City } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plane, Hotel, MapPin, CalendarClock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { format, parseISO, isFuture, isToday, isTomorrow, differenceInHours, formatDistanceToNowStrict, addHours, setHours, setMinutes, setSeconds } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMemo } from 'react';

interface UpcomingMilestoneProps {
  tripData: TripDetails;
  currentDate: Date | null;
  tripId: string; // Added tripId
}

type MilestoneCandidate = {
  type: 'travel' | 'city_arrival' | 'accommodation' | 'activity';
  title: string;
  date: Date; 
  originalDateString: string; 
  originalTimeString?: string; 
  icon: React.ReactNode;
  details?: string; 
};

const getIconForMilestone = (type: MilestoneCandidate['type']) => {
  switch (type) {
    case 'travel': return <Plane size={24} className="text-blue-500" />;
    case 'city_arrival': return <MapPin size={24} className="text-green-500" />;
    case 'accommodation': return <Hotel size={24} className="text-purple-500" />;
    case 'activity': return <CalendarClock size={24} className="text-orange-500" />;
    default: return <CalendarClock size={24} className="text-gray-500" />;
  }
};

export default function UpcomingMilestone({ tripData, currentDate, tripId }: UpcomingMilestoneProps) {
  const upcomingMilestone = useMemo(() => {
    if (!currentDate || !tripData) return null; 

    const now = currentDate; 
    const candidates: MilestoneCandidate[] = [];
    
    // Filter activities and cities for the current tripId
    const currentTripActivities = tripData.activities.filter(act => act.tripId === tripId);
    const currentTripCities = tripData.ciudades.filter(city => city.tripId === tripId);

    currentTripActivities
      .filter(act => {
        const actDateTime = parseISO(`${act.date}T${act.time}:00`);
        return act.category === 'Viaje' && isFuture(actDateTime) && actDateTime > now;
      })
      .forEach(act => {
        candidates.push({
          type: 'travel', title: act.title, date: parseISO(`${act.date}T${act.time}:00`),
          originalDateString: act.date, originalTimeString: act.time, icon: getIconForMilestone('travel'), details: `En ${act.city}`
        });
      });

    currentTripCities
      .forEach(city => {
        const arrivalDateTime = setSeconds(setMinutes(setHours(parseISO(city.arrivalDate), 12),0),0); 
        if (isFuture(arrivalDateTime) && arrivalDateTime > now) {
             candidates.push({
                type: 'city_arrival', title: `Llegada a ${city.name}`, date: arrivalDateTime,
                originalDateString: city.arrivalDate, icon: getIconForMilestone('city_arrival'), details: city.country
            });
        }
      });

    currentTripActivities
      .filter(act => {
         const actDateTime = parseISO(`${act.date}T${act.time}:00`);
        return act.category === 'Alojamiento' && isFuture(actDateTime) && actDateTime > now;
      })
      .forEach(act => {
        candidates.push({
          type: 'accommodation', title: act.title, date: parseISO(`${act.date}T${act.time}:00`),
          originalDateString: act.date, originalTimeString: act.time, icon: getIconForMilestone('accommodation'), details: `En ${act.city}`
        });
      });
    
    candidates.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    let selectedMilestone = candidates[0];

    if (!selectedMilestone) {
      const futureActivities = currentTripActivities
        .filter(act => {
            const actDateTime = parseISO(`${act.date}T${act.time}:00`);
            return isFuture(actDateTime) && actDateTime > now;
        })
        .sort((a,b) => parseISO(`${a.date}T${a.time}:00`).getTime() - parseISO(`${b.date}T${b.time}:00`).getTime());

      if (futureActivities.length > 0) {
        const nextAct = futureActivities[0];
        selectedMilestone = {
          type: 'activity', title: nextAct.title, date: parseISO(`${nextAct.date}T${nextAct.time}:00`),
          originalDateString: nextAct.date, originalTimeString: nextAct.time, icon: getIconForMilestone('activity'), details: `En ${nextAct.city}`
        };
      }
    }
    return selectedMilestone;
  }, [tripData, currentDate, tripId]); 

  const formatTimeRemaining = (milestoneDate: Date): string => {
    if(!currentDate) return "";
    const now = currentDate;
    const diffHoursTotal = differenceInHours(milestoneDate, now);

    if (isToday(milestoneDate) && diffHoursTotal >=0 ) {
       if (diffHoursTotal < 1 && diffHoursTotal >=0) {
         const minutesRemaining = formatDistanceToNowStrict(milestoneDate, { locale: es, unit: 'minute', roundingMethod: 'ceil', addSuffix: true }); // Removed now
         return `${minutesRemaining} (hoy a las ${format(milestoneDate, 'HH:mm')})`;
       }
       return `hoy a las ${format(milestoneDate, 'HH:mm')} (${formatDistanceToNowStrict(milestoneDate, { locale: es, addSuffix: true })})`; // Removed now
    }
    if (isTomorrow(milestoneDate)) {
      return `mañana a las ${format(milestoneDate, 'HH:mm')}`;
    }
    
    const distance = formatDistanceToNowStrict(milestoneDate, { locale: es, addSuffix: true, unit: 'day', roundingMethod: 'ceil' }); // Removed now
    return `${distance}, el ${format(milestoneDate, "EEEE d MMM 'a las' HH:mm", { locale: es })}`;
  };

  if (!currentDate) {
    return (
      <Card className="rounded-xl shadow-lg">
        <CardHeader><CardTitle className="font-headline text-xl text-primary flex items-center"><CalendarClock size={22} className="mr-2" />Próximamente</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl shadow-lg">
      <CardHeader><CardTitle className="font-headline text-xl text-primary flex items-center"><CalendarClock size={22} className="mr-2" />Próximamente</CardTitle></CardHeader>
      <CardContent>
        {upcomingMilestone ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-muted/50 rounded-full">{upcomingMilestone.icon}</div>
              <div>
                <p className="font-semibold text-lg text-foreground">{upcomingMilestone.title}</p>
                {upcomingMilestone.details && <p className="text-sm text-muted-foreground">{upcomingMilestone.details}</p>}
              </div>
            </div>
            <p className="text-md text-foreground/80">{format(upcomingMilestone.date, "EEEE, d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}</p>
            <p className="text-md font-semibold text-accent">{formatTimeRemaining(upcomingMilestone.date)}</p>
          </div>
        ) : (
          <div className="text-center py-4">
            <CheckCircle2 size={32} className="mx-auto text-green-500 mb-2" />
            <p className="text-muted-foreground">¡Todo planificado por ahora!</p>
            <p className="text-sm text-muted-foreground">No hay próximos hitos inminentes.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
