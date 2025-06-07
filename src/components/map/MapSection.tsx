"use client";
import type { TripDetails, City } from '@/lib/types';
import SectionCard from '@/components/ui/SectionCard';
import { MapPin, Route } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface MapSectionProps {
  tripData: TripDetails;
}

export default function MapSection({ tripData }: MapSectionProps) {
  return (
    <SectionCard 
      id="map" 
      title="Mapa de Viaje" 
      icon={<MapPin size={32} />}
      description="Visualiza nuestra ruta y las ciudades que visitaremos."
    >
      <div className="space-y-6">
        <div className="p-6 bg-muted/30 rounded-xl shadow-inner">
          <h3 className="text-xl font-headline text-secondary-foreground mb-4">Ciudades Planificadas</h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tripData.ciudades.map((city: City) => (
              <li key={city.name} className="p-4 bg-card rounded-lg shadow-sm">
                <p className="font-semibold text-lg text-primary">{city.name}, <span className="font-normal text-base text-muted-foreground">{city.country}</span></p>
                <p className="text-sm text-foreground/80">
                  {format(parseISO(city.arrivalDate), "d MMM", { locale: es })} - {format(parseISO(city.departureDate), "d MMM yyyy", { locale: es })}
                </p>
                {city.notes && <p className="text-xs text-accent-foreground/70 mt-1 italic">{city.notes}</p>}
              </li>
            ))}
          </ul>
        </div>
        <div className="text-center p-4 border-2 border-dashed border-border rounded-lg">
          <p className="text-muted-foreground">
            Mapa interactivo con Leaflet, pins y rutas próximamente.
          </p>
          <img data-ai-hint="world map" src="https://placehold.co/600x400.png" alt="Placeholder for an interactive map" className="mt-4 rounded-md mx-auto opacity-50" />
        </div>
      </div>
    </SectionCard>
  );
}
