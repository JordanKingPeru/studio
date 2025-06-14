
"use client";

import React, { useState, useMemo } from 'react';
// useJsApiLoader is no longer needed here as APIProvider handles it globally
import type { TripDetails, City } from '@/lib/types';
// GOOGLE_MAPS_LIBRARIES and GOOGLE_MAPS_SCRIPT_ID are not needed here anymore
import SectionCard from '@/components/ui/SectionCard';
import AddCityDialog, { type CityFormData } from './AddCityDialog';
import CityListCard from './CityListCard';
import { Button } from '@/components/ui/button';
import { Route, PlusCircle, List, Loader2 } from 'lucide-react'; // Added Loader2
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

  // The API key is now managed by APIProvider in client-providers.tsx
  // and directly by AddCityDialog for its places library usage.
  // No need for useJsApiLoader here.

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
            {/* 
              MapDisplay now handles its own rendering based on the global APIProvider.
              We don't need to manage 'isLoaded' or 'loadError' here for the map display itself.
              If APIProvider fails, MapDisplay might show its own fallback or an error from @vis.gl/react-google-maps.
            */}
            <MapDisplay cities={cities} />
          </div>
        </div>
      </div>

      {/* 
        AddCityDialog also uses useMapsLibrary internally and doesn't need isLoaded prop from here.
        It will show its own loading/error states for the places library if needed.
      */}
      <AddCityDialog
          isOpen={isCityFormOpen}
          onOpenChange={setIsCityFormOpen}
          onSaveCity={onSaveCity}
          initialData={editingCity}
          // isLoaded prop is no longer needed
      />
    </SectionCard>
  );
}
