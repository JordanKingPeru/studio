
"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import type { City, Coordinates } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface MapDisplayProps {
  cities: City[];
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.75rem',
};

const defaultCenter: Coordinates = { lat: 40.416775, lng: -3.703790 };

export default function MapDisplay({ cities }: MapDisplayProps) {
  const [selectedCity, setSelectedCity] = useState<City | null>(null);

  const validCities = useMemo(() => cities.filter(city =>
    typeof city.coordinates?.lat === 'number' &&
    typeof city.coordinates?.lng === 'number' &&
    (city.coordinates.lat !== 0 || city.coordinates.lng !== 0 || (city.id && city.name))
  ), [cities]);

  const mapDefaultCenter = useMemo(() => {
    if (validCities.length >= 1) {
      return validCities[0].coordinates;
    }
    return defaultCenter;
  }, [validCities]);

  const mapDefaultZoom = useMemo(() => {
    if (validCities.length === 1) {
      return 7;
    } else if (validCities.length > 1) {
      return 3;
    }
    return 2;
  }, [validCities]);

  // Create a key for the Map component that changes when the list of cities changes.
  // This will force the map to re-mount and apply the new defaultCenter/defaultZoom.
  const mapKey = useMemo(() => {
    if (validCities.length === 0) return 'no-cities';
    return validCities.map(c => c.id).join(',');
  }, [validCities]);

  const handleMarkerClick = useCallback((city: City) => {
    setSelectedCity(city);
  }, []);

  const handleInfoWindowClose = useCallback(() => {
    setSelectedCity(null);
  }, []);

  return (
    <Map
      key={mapKey} // Force re-mount when cities change
      mapId="main-trip-map"
      style={mapContainerStyle}
      defaultCenter={mapDefaultCenter}
      defaultZoom={mapDefaultZoom}
      gestureHandling={'auto'}
      disableDefaultUI={false}
      streetViewControl={false}
      mapTypeControl={false}
      fullscreenControl={true}
      zoomControl={true}
      clickableIcons={true}
    >
      {validCities.map((city) => (
        <AdvancedMarker
          key={city.id || `${city.name}-${city.coordinates.lat}-${city.coordinates.lng}`}
          position={city.coordinates}
          onClick={() => handleMarkerClick(city)}
          title={city.name}
        >
        </AdvancedMarker>
      ))}

      {selectedCity && (
        <InfoWindow
          position={selectedCity.coordinates}
          onCloseClick={handleInfoWindowClose}
          pixelOffset={[0, -30]}
        >
          <Card className="w-48 shadow-none border-none p-0 m-0">
            <CardHeader className="p-2 pb-1">
              <CardTitle className="text-sm font-semibold text-primary">{selectedCity.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <p className="text-xs text-muted-foreground">{selectedCity.country}</p>
            </CardContent>
          </Card>
        </InfoWindow>
      )}
    </Map>
  );
}
