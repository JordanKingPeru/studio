
"use client";

import React, { useState } from 'react';
import type { TripDetails, City } from '@/lib/types';
import SectionCard from '@/components/ui/SectionCard';
import CityFormDialog, { type CityFormData } from './CityFormDialog';
import CityListCard from './CityListCard';
import { Button } from '@/components/ui/button';
import { Route, PlusCircle, List } from 'lucide-react';
import Image from 'next/image';

interface MapSectionProps {
  tripData: TripDetails; // For context like trip dates
  cities: City[]; // Managed by DashboardView
  onSaveCity: (cityData: CityFormData) => Promise<void>; // To add/update city in Firestore
  onDeleteCity: (cityId: string) => Promise<void>; // To delete city from Firestore
}

export default function MapSection({
  tripData,
  cities,
  onSaveCity,
  onDeleteCity,
}: MapSectionProps) {
  const [isCityFormOpen, setIsCityFormOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);

  const handleOpenForm = (city?: City) => {
    setEditingCity(city || null);
    setIsCityFormOpen(true);
  };

  const headerActions = (
    <Button onClick={() => handleOpenForm()} variant="default" size="sm">
      <PlusCircle size={18} className="mr-2" />
      Añadir Ciudad
    </Button>
  );

  return (
    <SectionCard
      id="map"
      title="Mapa de Viaje"
      icon={<Route size={32} />}
      description="Gestiona y visualiza las ciudades de tu itinerario."
      headerActions={headerActions}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Columna para la lista de ciudades */}
        <div className="md:col-span-1 space-y-4 max-h-[600px] overflow-y-auto pr-2">
          <h3 className="text-lg font-semibold text-secondary-foreground flex items-center mb-3">
            <List size={20} className="mr-2 text-primary" />
            Ciudades Planificadas
          </h3>
          {cities.length > 0 ? (
            cities.map((city) => (
              <CityListCard
                key={city.id}
                city={city}
                onEdit={() => handleOpenForm(city)}
                onDelete={onDeleteCity}
              />
            ))
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Aún no has añadido ninguna ciudad a tu itinerario.
            </p>
          )}
        </div>

        {/* Columna para el placeholder del mapa */}
        <div className="md:col-span-2">
            <div className="sticky top-24"> {/* Para que el mapa (placeholder) se quede fijo al hacer scroll en la lista */}
                <h3 className="text-lg font-semibold text-secondary-foreground mb-3">
                Vista del Mapa
                </h3>
                <div className="aspect-video w-full bg-muted/30 rounded-xl shadow-inner flex flex-col items-center justify-center p-6 border-2 border-dashed border-border">
                <p className="text-lg text-muted-foreground mb-4 text-center">
                    Mapa interactivo con Leaflet, pins y rutas próximamente.
                </p>
                <div className="max-w-md w-full">
                    <Image
                    data-ai-hint="world map"
                    src="https://placehold.co/600x350.png" 
                    alt="Marcador de posición para mapa interactivo"
                    width={600}
                    height={350}
                    className="rounded-lg shadow-md opacity-70 object-contain"
                    />
                </div>
                </div>
            </div>
        </div>
      </div>

      <CityFormDialog
        isOpen={isCityFormOpen}
        onOpenChange={setIsCityFormOpen}
        onSaveCity={async (data) => {
          await onSaveCity(data);
          // No es necesario setIsCityFormOpen(false) aquí si onSaveCity cierra el diálogo
          // o si el diálogo se cierra automáticamente al cambiar onOpenChange
        }}
        initialData={editingCity}
      />
    </SectionCard>
  );
}
