
"use client";
import type { TripDetails } from '@/lib/types';
import SectionCard from '@/components/ui/SectionCard';
import { Route } from 'lucide-react';
import Image from 'next/image';

interface MapSectionProps {
  tripData: TripDetails; // Kept for potential basic info display, can be removed if not needed
}

export default function MapSection({ tripData }: MapSectionProps) {
  // Log para verificar que NEXT_PUBLIC_GOOGLE_MAPS_API_KEY está (o no) disponible
  // console.log("MapSection: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:", process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? "Set" : "Not Set");

  return (
    <SectionCard
      id="map"
      title="Mapa de Viaje"
      icon={<Route size={32} />}
      description="Visualiza las ciudades de tu itinerario y planifica tus rutas."
      // headerActions can be added later when "Add City" functionality is re-implemented
    >
      <div className="space-y-6">
        <div className="text-center p-6 border-2 border-dashed border-border rounded-xl bg-muted/20">
          <p className="text-lg text-muted-foreground mb-4">
            ¡Funcionalidad de mapa interactivo próximamente!
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Aquí podrás ver todas tus ciudades en un mapa, planificar rutas y explorar puntos de interés.
          </p>
          <div className="flex justify-center">
            <Image
              data-ai-hint="map placeholder"
              src="https://placehold.co/600x400.png"
              alt="Marcador de posición para mapa interactivo"
              width={600}
              height={400}
              className="rounded-lg shadow-md opacity-70"
            />
          </div>
        </div>
        
        {/* Información básica del viaje (opcional, como ejemplo) */}
        <div className="p-4 border rounded-lg bg-card">
          <h4 className="text-md font-semibold text-primary mb-2">Resumen del Viaje:</h4>
          <p className="text-sm text-foreground">Destinos principales: {tripData.paises.join(', ')}.</p>
          <p className="text-sm text-foreground">Duración total: De {tripData.inicio} a {tripData.fin}.</p>
        </div>

      </div>
    </SectionCard>
  );
}
