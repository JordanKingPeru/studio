
"use client";

import { Button } from '@/components/ui/button';
import { CalendarDays, ListChecks, ArrowLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface TripHeaderProps {
  tripName: string;
  startDate: string;
  endDate: string;
  onViewFullItinerary: () => void;
  isDashboard: boolean;
  onReturnToDashboard?: () => void; 
}

export default function TripHeader({ tripName, startDate, endDate, onViewFullItinerary, isDashboard, onReturnToDashboard }: TripHeaderProps) {
  const formattedStartDate = format(parseISO(startDate), "d 'de' MMM.", { locale: es });
  const formattedEndDate = format(parseISO(endDate), "d 'de' MMM. 'de' yyyy", { locale: es });

  return (
    <div className="py-6 md:py-8 border-b border-border mb-6 md:mb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4 flex-grow min-w-0">
          {!isDashboard && onReturnToDashboard && (
            <Button onClick={onReturnToDashboard} variant="outline" size="icon" aria-label="Volver al Dashboard" className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
              <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          )}
          <div className="min-w-0">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-headline font-bold text-primary" title={tripName}>
              {tripName}
            </h1>
            <p className="text-lg text-muted-foreground flex items-center gap-2 mt-1">
              <CalendarDays size={20} />
              Del {formattedStartDate} al {formattedEndDate}
            </p>
          </div>
        </div>
        {isDashboard && (
          <Button onClick={onViewFullItinerary} variant="outline" size="lg" className="shrink-0">
            <ListChecks className="mr-2 h-5 w-5" />
            Ver Itinerario Completo
          </Button>
        )}
      </div>
    </div>
  );
}
