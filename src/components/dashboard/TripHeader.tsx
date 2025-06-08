
"use client";

import { Button } from '@/components/ui/button';
import { CalendarDays, ListChecks } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface TripHeaderProps {
  tripName: string;
  startDate: string;
  endDate: string;
  onViewFullItinerary: () => void;
  isDashboard: boolean;
}

export default function TripHeader({ tripName, startDate, endDate, onViewFullItinerary, isDashboard }: TripHeaderProps) {
  const formattedStartDate = format(parseISO(startDate), "d 'de' MMM.", { locale: es });
  const formattedEndDate = format(parseISO(endDate), "d 'de' MMM. 'de' yyyy", { locale: es });

  return (
    <div className="py-6 md:py-8 border-b border-border mb-6 md:mb-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-headline font-bold text-primary">
            {tripName}
          </h1>
          <p className="text-lg text-muted-foreground flex items-center gap-2 mt-1">
            <CalendarDays size={20} />
            Del {formattedStartDate} al {formattedEndDate}
          </p>
        </div>
        {isDashboard && (
          <Button onClick={onViewFullItinerary} variant="outline" size="lg">
            <ListChecks className="mr-2 h-5 w-5" />
            Ver Itinerario Completo
          </Button>
        )}
      </div>
      {/* Placeholder for member avatars if collaboration is implemented */}
      {/* <div className="mt-2 flex items-center space-x-2">
        <p className="text-sm text-muted-foreground">Miembros:</p>
        Avatares aquí
      </div> */}
    </div>
  );
}
