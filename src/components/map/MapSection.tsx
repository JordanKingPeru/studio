
"use client";
import type { TripDetails, City, Coordinates } from '@/lib/types';
import SectionCard from '@/components/ui/SectionCard';
import { MapPin as MapPinIconLucide, Route, PlusCircle, Trash2, Edit2 } from 'lucide-react'; // Added Edit2
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useJsApiLoader, GoogleMap, MarkerF } from '@react-google-maps/api';
import { useState } from 'react';
import AddCityDialog from './AddCityDialog'; 
import type { CityFormData } from './AddCityDialog';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const libraries: ("places")[] = ['places'];

interface MapSectionProps {
  tripData: TripDetails;
  cities: City[];
  onSaveCity: (cityData: CityFormData) => Promise<void>; // Renamed from onAddCity
  onDeleteCity: (cityId: string) => Promise<void>;
}

const mapPreviewContainerStyle = {
  width: '100%',
  height: '60px',
  borderRadius: '0.25rem', // sm
  marginBottom: '0.5rem', // mb-2
};

export default function MapSection({ tripData, cities, onSaveCity, onDeleteCity }: MapSectionProps) {
  const [isCityFormOpen, setIsCityFormOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || "",
    libraries,
    language: 'es', 
    region: 'ES',   
  });

  const handleOpenAddDialog = () => {
    setEditingCity(null); // Ensure we are adding, not editing
    setIsCityFormOpen(true);
  };
  
  const handleOpenEditDialog = (city: City) => {
    setEditingCity(city);
    setIsCityFormOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsCityFormOpen(open);
    if (!open) {
      setEditingCity(null); // Clear editing state when dialog is closed
    }
  };
  
  const headerActions = (
     <Button onClick={handleOpenAddDialog} disabled={!isLoaded && !loadError && !GOOGLE_MAPS_API_KEY}>
        <PlusCircle size={20} className="mr-2" />
        Añadir Ciudad
      </Button>
  );

  if (!GOOGLE_MAPS_API_KEY) {
    console.warn("MapSection: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set. Map functionalities will be limited.");
  }

  return (
    <SectionCard
      id="map"
      title="Mapa de Viaje"
      icon={<Route size={32} />}
      description="Gestiona y visualiza las ciudades de tu itinerario."
      headerActions={headerActions}
    >
      {!GOOGLE_MAPS_API_KEY && (
        <p className="text-center text-destructive mb-4">
          Advertencia: La clave API de Google Maps no está configurada. La búsqueda de ciudades y los mapas no funcionarán.
        </p>
      )}
      <div className="space-y-8">
        <div className="p-2 sm:p-0">
          <h3 className="text-xl font-headline text-secondary-foreground mb-4">Ciudades Planificadas</h3>
          {cities.length > 0 ? (
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cities.sort((a,b) => parseISO(a.arrivalDate).getTime() - parseISO(b.arrivalDate).getTime()).map((city: City) => (
                <li key={city.id} className="bg-card rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
                  {isLoaded && GOOGLE_MAPS_API_KEY && !loadError && city.coordinates && typeof city.coordinates.lat === 'number' && typeof city.coordinates.lng === 'number' && (city.coordinates.lat !== 0 || city.coordinates.lng !== 0) && (
                     <div className="h-[60px] w-full">
                       <GoogleMap
                          mapContainerStyle={mapPreviewContainerStyle}
                          center={city.coordinates}
                          zoom={8}
                          options={{
                            disableDefaultUI: true,
                            draggable: false,
                            scrollwheel: false,
                            gestureHandling: 'none',
                            clickableIcons: false,
                          }}
                        >
                          <MarkerF position={city.coordinates} />
                        </GoogleMap>
                     </div>
                  )}
                  <div className="p-4 relative group">
                    <div className="absolute top-2 right-2 flex gap-1">
                       <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary opacity-50 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleOpenEditDialog(city)}
                        aria-label={`Editar ${city.name}`}
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-50 group-hover:opacity-100 transition-opacity"
                        onClick={() => onDeleteCity(city.id)}
                        aria-label={`Eliminar ${city.name}`}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                    <p className="font-semibold text-lg text-primary pr-16 truncate" title={`${city.name}, ${city.country}`}>
                      {city.name}, <span className="font-normal text-base text-muted-foreground">{city.country}</span>
                    </p>
                    <p className="text-sm text-foreground/80">
                      {format(parseISO(city.arrivalDate), "d MMM", { locale: es })} - {format(parseISO(city.departureDate), "d MMM yyyy", { locale: es })}
                    </p>
                    {city.notes && <p className="text-xs text-accent-foreground/70 mt-1 italic truncate" title={city.notes}>{city.notes}</p>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-center py-4">No hay ciudades planificadas. ¡Añade la primera!</p>
          )}
        </div>

        <div className="text-center p-4 border-2 border-dashed border-border rounded-lg mt-8">
          <p className="text-muted-foreground">
            Mapa interactivo principal con todas las ciudades y rutas próximamente.
          </p>
          <img data-ai-hint="world map route" src="https://placehold.co/600x400.png" alt="Placeholder for an interactive map" className="mt-4 rounded-md mx-auto opacity-50" />
        </div>
      </div>
      
      {GOOGLE_MAPS_API_KEY && (
        <AddCityDialog
          isOpen={isCityFormOpen}
          onOpenChange={handleDialogClose}
          onSaveCity={onSaveCity} 
          googleMapsApiKey={GOOGLE_MAPS_API_KEY}
          isGoogleMapsApiLoaded={isLoaded}
          googleMapsApiLoadError={loadError}
          initialData={editingCity}
        />
      )}
    </SectionCard>
  );
}
