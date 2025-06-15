
"use client";

import React, { useState, useMemo } from 'react';
import type { TripDetails, City } from '@/lib/types';
import type { CityFormData } from './AddCityDialog';
import SectionCard from '@/components/ui/SectionCard';
import AddCityDialog from './AddCityDialog';
import CityListCard from './CityListCard';
import { Button } from '@/components/ui/button';
import { Route, PlusCircle, List } from 'lucide-react';
import MapDisplay from './MapDisplay';

interface MapSectionProps {
  tripData: TripDetails;
  cities: City[];
  onSaveCity: (cityData: CityFormData) => Promise<void>;
  onDeleteCity: (cityId: string) => Promise<void>;
  tripId: string; // Added tripId
}

export default function MapSection({
  tripData,
  cities,
  onSaveCity,
  onDeleteCity,
  tripId, // Use tripId
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

  // Filter cities for the current tripId before sorting and displaying
  const currentTripCities = useMemo(() => {
    return cities
      .filter(city => city.tripId === tripId)
      .sort((a, b) => new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime());
  }, [cities, tripId]);

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
            Ciudades Planificadas ({currentTripCities.length})
          </h3>
          {currentTripCities.length > 0 ? (
            currentTripCities.map((city) => (
              <CityListCard
                key={city.id}
                city={city}
                onEdit={() => handleOpenForm(city)}
                onDelete={onDeleteCity}
              />
            ))
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Aún no has añadido ninguna ciudad a este itinerario.
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <div className="sticky top-20 h-[550px] rounded-xl shadow-lg overflow-hidden border">
            <MapDisplay cities={currentTripCities} /> {/* Pass filtered cities */}
          </div>
        </div>
      </div>
      <AddCityDialog
          isOpen={isCityFormOpen}
          onOpenChange={setIsCityFormOpen}
          onSaveCity={onSaveCity}
          initialData={editingCity}
          tripId={tripId} // Pass tripId to AddCityDialog
      />
    </SectionCard>
  );
}
