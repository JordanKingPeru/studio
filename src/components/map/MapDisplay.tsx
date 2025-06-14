
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import type { City, Coordinates } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface MapDisplayProps {
  cities: City[];
  // isLoaded prop is no longer needed as APIProvider handles loading globally
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.75rem', // Consistent with MapSection's rounded-xl on the parent
};

const defaultCenter: Coordinates = { lat: 40.416775, lng: -3.703790 }; // Default to Madrid or a general world view

export default function MapDisplay({ cities }: MapDisplayProps) {
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [mapCenter, setMapCenter] = useState<Coordinates>(defaultCenter);
  const [mapZoom, setMapZoom] = useState<number>(2); // Start zoomed out

  const validCities = useMemo(() => cities.filter(city =>
    typeof city.coordinates?.lat === 'number' &&
    typeof city.coordinates?.lng === 'number' &&
    // Allow 0,0 only if it's not the default placeholder (e.g. if a city truly is at 0,0)
    // For now, we'll assume 0,0 is generally uninitialized unless it has a name.
    (city.coordinates.lat !== 0 || city.coordinates.lng !== 0 || (city.id && city.name))
  ), [cities]);

  useEffect(() => {
    if (validCities.length === 1) {
      setMapCenter(validCities[0].coordinates);
      setMapZoom(7); // Zoom in on a single city
    } else if (validCities.length > 1) {
      // Simple logic: center on the first city, keep zoom broader.
      // A more complex approach would calculate a bounding box.
      setMapCenter(validCities[0].coordinates);
      setMapZoom(3); // Adjust as needed for multiple cities
    } else {
      setMapCenter(defaultCenter);
      setMapZoom(2);
    }
  }, [validCities]);

  const handleMarkerClick = useCallback((city: City) => {
    setSelectedCity(city);
    setMapCenter(city.coordinates); // Center map on clicked city
    setMapZoom(9); // Zoom in a bit more on selected city
  }, []);
  
  const handleInfoWindowClose = useCallback(() => {
    setSelectedCity(null);
    // Optionally, reset zoom/center if desired when an infowindow closes
    // if (validCities.length === 1) setMapZoom(7);
    // else if (validCities.length > 1) setMapZoom(3);
  }, []);


  // The APIProvider in ClientProviders handles the actual loading state for the whole app.
  // We assume here that if MapDisplay is rendered, the API should be available.
  // A more robust check could involve useContext if a global load status is needed here.

  return (
    <Map
      mapId="main-trip-map" // Optional: for Cloud-based Map Styling
      style={mapContainerStyle}
      center={mapCenter}
      zoom={mapZoom}
      gestureHandling={'greedy'}
      disableDefaultUI={true}
      streetViewControl={false}
      mapTypeControl={false}
      fullscreenControl={false}
      zoomControl={true}
      clickableIcons={false} // Good practice
    >
      {validCities.map((city) => (
        <AdvancedMarker
          key={city.id || `${city.name}-${city.coordinates.lat}-${city.coordinates.lng}`}
          position={city.coordinates}
          onClick={() => handleMarkerClick(city)}
          title={city.name}
        >
          {/* You can customize the marker Pin, e.g., color */}
          {/* <Pin borderColor="blue" glyphColor="white" background="red" /> */}
        </AdvancedMarker>
      ))}

      {selectedCity && (
        <InfoWindow
          position={selectedCity.coordinates}
          onCloseClick={handleInfoWindowClose}
          pixelOffset={[0,-30]} // Adjust as needed
        >
          <Card className="w-48 shadow-none border-none p-0 m-0">
            <CardHeader className="p-2 pb-1">
                <CardTitle className="text-sm font-semibold text-primary">{selectedCity.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0">
                <p className="text-xs text-muted-foreground">{selectedCity.country}</p>
                {/* Add more details if desired, e.g., dates */}
            </CardContent>
          </Card>
        </InfoWindow>
      )}
    </Map>
  );
}
