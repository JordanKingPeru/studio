
"use client";

import type { TripDetails, Activity, City } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plane, Hotel, MapPin, CalendarClock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format, parseISO, isFuture, isToday, isTomorrow, differenceInHours, formatDistanceToNowStrict, addHours, setHours, setMinutes, setSeconds } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMemo } from 'react';

interface UpcomingMilestoneProps {
  tripData: TripDetails;
}

type MilestoneCandidate = {
  type: 'travel' | 'city_arrival' | 'accommodation' | 'activity';
  title: string;
  date: Date; // Full JS Date object for easier comparison
  originalDateString: string; // YYYY-MM-DD
  originalTimeString?: string; // HH:MM
  icon: React.ReactNode;
  details?: string; // e.g., city name for arrival
};

const getIconForMilestone = (type: MilestoneCandidate['type'], category?: Activity['category']) => {
  switch (type) {
    case 'travel':
      return <Plane size={24} className="text-blue-500" />;
    case 'city_arrival':
      return <MapPin size={24} className="text-green-500" />;
    case 'accommodation':
      return <Hotel size={24} className="text-purple-500" />;
    case 'activity':
      // Add more specific icons based on activity category if needed
      return <CalendarClock size={24} className="text-orange-500" />;
    default:
      return <CalendarClock size={24} className="text-gray-500" />;
  }
};

export default function UpcomingMilestone({ tripData }: UpcomingMilestoneProps) {
  const now = new Date();

  const upcomingMilestone = useMemo(() => {
    const candidates: MilestoneCandidate[] = [];
    const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Today at 00:00:00


    // 1. Future Travel Activities
    tripData.activities
      .filter(act => {
        const actDateTime = parseISO(`${act.date}T${act.time}:00`);
        return act.category === 'Viaje' && isFuture(actDateTime);
      })
      .forEach(act => {
        candidates.push({
          type: 'travel',
          title: act.title,
          date: parseISO(`${act.date}T${act.time}:00`),
          originalDateString: act.date,
          originalTimeString: act.time,
          icon: getIconForMilestone('travel'),
          details: `En ${act.city}`
        });
      });

    // 2. Future City Arrivals
    tripData.ciudades
      .filter(city => {
        const cityArrivalDateOnly = parseISO(city.arrivalDate);
        // Consider arrivals from today if it's still in the future, or any day after today
        return isFuture(cityArrivalDateOnly) || isToday(cityArrivalDateOnly);
      })
      .forEach(city => {
        // Assume arrival is at 12:00 PM for sorting purposes if no specific activity marks it
        const arrivalDateTime = setSeconds(setMinutes(setHours(parseISO(city.arrivalDate), 12),0),0);
        if (isFuture(arrivalDateTime)) { // Only add if the 12 PM mark is in the future
             candidates.push({
                type: 'city_arrival',
                title: `Llegada a ${city.name}`,
                date: arrivalDateTime,
                originalDateString: city.arrivalDate,
                icon: getIconForMilestone('city_arrival'),
                details: city.country
            });
        }
      });

    // 3. Future Accommodation Check-ins
    tripData.activities
      .filter(act => {
         const actDateTime = parseISO(`${act.date}T${act.time}:00`);
        return act.category === 'Alojamiento' && isFuture(actDateTime);
      })
      .forEach(act => {
        candidates.push({
          type: 'accommodation',
          title: act.title,
          date: parseISO(`${act.date}T${act.time}:00`),
          originalDateString: act.date,
          originalTimeString: act.time,
          icon: getIconForMilestone('accommodation'),
          details: `En ${act.city}`
        });
      });
    
    // Sort candidates by date (earliest first)
    // The priority is handled by the order of adding and then potentially by a more complex sort if needed.
    // For now, simple date sort.
    candidates.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    let selectedMilestone = candidates[0];

    // 4. Fallback: First activity of any future day if no specific milestones found
    if (!selectedMilestone) {
      const futureActivities = tripData.activities
        .filter(act => isFuture(parseISO(`${act.date}T${act.time}:00`)))
        .sort((a,b) => parseISO(`${a.date}T${a.time}:00`).getTime() - parseISO(`${b.date}T${b.time}:00`).getTime());

      if (futureActivities.length > 0) {
        const nextAct = futureActivities[0];
        selectedMilestone = {
          type: 'activity',
          title: nextAct.title,
          date: parseISO(`${nextAct.date}T${nextAct.time}:00`),
          originalDateString: nextAct.date,
          originalTimeString: nextAct.time,
          icon: getIconForMilestone('activity', nextAct.category),
          details: `En ${nextAct.city}`
        };
      }
    }
    
    return selectedMilestone;

  }, [tripData, now]); // now is a dependency to re-calculate if the component re-renders across a time boundary

  const formatTimeRemaining = (milestoneDate: Date): string => {
    const diffHoursTotal = differenceInHours(milestoneDate, now);

    if (isToday(milestoneDate) && diffHoursTotal >=0 ) {
       if (diffHoursTotal < 1 && diffHoursTotal >=0) {
         const minutesRemaining = formatDistanceToNowStrict(milestoneDate, { locale: es, unit: 'minute', roundingMethod: 'ceil', addSuffix: true });
         return `${minutesRemaining} (hoy a las ${format(milestoneDate, 'HH:mm')})`;
       }
       return `hoy a las ${format(milestoneDate, 'HH:mm')} (${formatDistanceToNowStrict(milestoneDate, { locale: es, addSuffix: true })})`;
    }
    if (isTomorrow(milestoneDate)) {
      return `mañana a las ${format(milestoneDate, 'HH:mm')}`;
    }
    // For events further in the future
    const distance = formatDistanceToNowStrict(milestoneDate, { locale: es, addSuffix: true, unit: 'day', roundingMethod: 'ceil' });
    return `${distance}, el ${format(milestoneDate, "EEEE d MMM 'a las' HH:mm", { locale: es })}`;
  };


  return (
    <Card className="rounded-xl shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl text-primary flex items-center">
          <CalendarClock size={22} className="mr-2" />
          Próximamente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingMilestone ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-muted/50 rounded-full">
                {upcomingMilestone.icon}
              </div>
              <div>
                <p className="font-semibold text-lg text-foreground">{upcomingMilestone.title}</p>
                {upcomingMilestone.details && <p className="text-sm text-muted-foreground">{upcomingMilestone.details}</p>}
              </div>
            </div>
            <p className="text-md text-foreground/80">
              {format(upcomingMilestone.date, "EEEE, d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
            </p>
            <p className="text-md font-semibold text-accent">
              {formatTimeRemaining(upcomingMilestone.date)}
            </p>
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

