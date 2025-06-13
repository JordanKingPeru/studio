
"use client";

import React, { useState, useMemo } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import type { TripDetails, City } from '@/lib/types';
import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_SCRIPT_ID } from '@/lib/constants';
import SectionCard from '@/components/ui/SectionCard';
import AddCityDialog, { type CityFormData } from './AddCityDialog';
import CityListCard from './CityListCard';
import { Button } from '@/components/ui/button';
import { Route, PlusCircle, List } from 'lucide-react';
import MapDisplay from './MapDisplay';

interface MapSectionProps {
  tripData: TripDetails;
  cities: City[];
  onSaveCity: (cityData: CityFormData) => Promise<void>;
  onDeleteCity: (cityId: string) => Promise<void>;
}

export default function MapSection({
  tripData,
  cities,
  onSaveCity,
  onDeleteCity,
}: MapSectionProps) {
  const [isCityFormOpen, setIsCityFormOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_SCRIPT_ID,
    googleMapsApiKey: googleMapsApiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  console.log('MapSection isLoaded:', isLoaded);

  const handleOpenForm = (city?: City) => {
    setEditingCity(city || null);
    setIsCityFormOpen(true);
  };

  const headerActions = (
    <Button onClick={() => handleOpenForm()} variant="default" size="sm" disabled={!isLoaded}>
      <PlusCircle size={18} className="mr-2" />
      Añadir Ciudad
    </Button>
  );

  const sortedCities = useMemo(() => {
    return [...cities].sort((a, b) => new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime());
  }, [cities]);

  return (
    <SectionCard
      id="map"
      title="Mapa de Viaje"
      icon={<Route size={32} />}
      description="Gestiona y visualiza las ciudades de tu itinerario."
      headerActions={headerActions}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
          <h3 className="text-lg font-semibold text-secondary-foreground flex items-center mb-3 sticky top-0 bg-card py-2 z-10">
            <List size={20} className="mr-2 text-primary" />
            Ciudades Planificadas ({sortedCities.length})
          </h3>
          {sortedCities.length > 0 ? (
            sortedCities.map((city) => (
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

        <div className="md:col-span-2">
          <div className="sticky top-20 h-[550px] rounded-xl shadow-lg overflow-hidden border">
            {loadError ? (
              <div className="flex flex-col items-center justify-center h-full bg-destructive/5 p-4 rounded-xl">
                <p className="text-destructive-foreground font-semibold">Error al cargar Google Maps.</p>
                <p className="text-muted-foreground text-sm mt-1 text-center">
                  Por favor, comprueba tu conexión a internet y la configuración de la API Key.
                </p>
              </div>
            ) : (
              <MapDisplay cities={cities} isLoaded={isLoaded} />
            )}
          </div>
        </div>
      </div>

      {isLoaded && (
        <AddCityDialog
            isOpen={isCityFormOpen}
            onOpenChange={setIsCityFormOpen}
            onSaveCity={onSaveCity}
            initialData={editingCity}
            isLoaded={isLoaded}
        />
      )}
    </SectionCard>
  );
}
