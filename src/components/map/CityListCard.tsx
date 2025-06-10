
"use client";

import type { City } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, CalendarDays, StickyNote, Edit2, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface CityListCardProps {
  city: City;
  onEdit: (city: City) => void;
  onDelete: (cityId: string) => void;
}

export default function CityListCard({ city, onEdit, onDelete }: CityListCardProps) {
  const formattedArrival = format(parseISO(city.arrivalDate), "d MMM yyyy", { locale: es });
  const formattedDeparture = format(parseISO(city.departureDate), "d MMM yyyy", { locale: es });

  return (
    <Card className="mb-4 shadow-lg rounded-xl overflow-hidden hover:shadow-xl transition-shadow">
      <CardHeader className="pb-3 pt-4 bg-muted/40">
        <div className="flex justify-between items-start">
          <div className="flex-grow min-w-0">
            <CardTitle className="text-xl font-headline text-primary flex items-center">
              <MapPin size={20} className="mr-2 shrink-0" />
              <span className="truncate" title={`${city.name}, ${city.country}`}>{city.name}, {city.country}</span>
            </CardTitle>
            <CardDescription className="flex items-center text-sm mt-1">
              <CalendarDays size={14} className="mr-1.5" />
              {formattedArrival} - {formattedDeparture}
            </CardDescription>
          </div>
          <div className="flex space-x-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => onEdit(city)} aria-label={`Editar ${city.name}`} className="h-8 w-8">
              <Edit2 size={16} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onDelete(city.id)} 
              aria-label={`Eliminar ${city.name}`} 
              className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
      </CardHeader>
      {city.notes && (
        <CardContent className="pt-3 pb-4">
          <div className="flex items-start text-sm text-foreground/80">
            <StickyNote size={15} className="mr-2 mt-0.5 shrink-0 text-muted-foreground" />
            <p className="whitespace-pre-wrap">{city.notes}</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
