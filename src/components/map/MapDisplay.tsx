
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import type { City, Coordinates } from '@/lib/types';
import { Loader2 } from 'lucide-react';
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
  const [mapCenter, setMapCenter] = useState<Coordinates>(defaultCenter);
  const [mapZoom, setMapZoom] = useState<number>(2); 

  const validCities = useMemo(() => cities.filter(city =>
    typeof city.coordinates?.lat === 'number' &&
    typeof city.coordinates?.lng === 'number' &&
    (city.coordinates.lat !== 0 || city.coordinates.lng !== 0 || (city.id && city.name))
  ), [cities]);

  useEffect(() => {
    if (validCities.length === 1) {
      setMapCenter(validCities[0].coordinates);
      setMapZoom(7); 
    } else if (validCities.length > 1) {
      setMapCenter(validCities[0].coordinates);
      setMapZoom(3); 
    } else {
      setMapCenter(defaultCenter);
      setMapZoom(2);
    }
  }, [validCities]);

  const handleMarkerClick = useCallback((city: City) => {
    setSelectedCity(city);
    setMapCenter(city.coordinates); 
    setMapZoom(9); 
  }, []);
  
  const handleInfoWindowClose = useCallback(() => {
    setSelectedCity(null);
  }, []);


  return (
    <Map
      mapId="main-trip-map" 
      style={mapContainerStyle}
      center={mapCenter}
      zoom={mapZoom}
      gestureHandling={'greedy'}
      disableDefaultUI={true}
      streetViewControl={false}
      mapTypeControl={false}
      fullscreenControl={false}
      zoomControl={true}
      clickableIcons={false} 
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
          pixelOffset={[0,-30]} 
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
