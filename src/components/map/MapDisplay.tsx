
"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { GoogleMap, MarkerF, InfoWindowF } from '@react-google-maps/api';
import type { City, Coordinates } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface MapDisplayProps {
  cities: City[];
  isLoaded: boolean;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.75rem',
};

const defaultCenter: Coordinates = { lat: 20, lng: 0 }; // General world view

export default function MapDisplay({ cities, isLoaded }: MapDisplayProps) {
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);

  const validCities = useMemo(() => cities.filter(city =>
    typeof city.coordinates?.lat === 'number' &&
    typeof city.coordinates?.lng === 'number' &&
    (city.coordinates.lat !== 0 || city.coordinates.lng !== 0 || (city.id && city.name))
  ), [cities]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMapRef(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMapRef(null);
    setSelectedCity(null);
  }, []);

  useEffect(() => {
    if (mapRef && validCities.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      validCities.forEach(city => {
        if (city.coordinates?.lat != null && city.coordinates?.lng != null) {
            bounds.extend(new window.google.maps.LatLng(city.coordinates.lat, city.coordinates.lng));
        }
      });
      if (validCities.length > 0 && bounds.getNorthEast() && bounds.getSouthWest() && !bounds.getNorthEast().equals(bounds.getSouthWest()) ) {
         mapRef.fitBounds(bounds);
      } else if (validCities.length === 1 && validCities[0].coordinates) {
        mapRef.setCenter(validCities[0].coordinates);
        mapRef.setZoom(7);
      } else {
        mapRef.setCenter(defaultCenter);
        mapRef.setZoom(2);
      }

      const listener = window.google.maps.event.addListenerOnce(mapRef, 'idle', () => {
        if (validCities.length === 1 && mapRef.getZoom()! > 7) {
          mapRef.setZoom(7);
        } else if (validCities.length > 1 && mapRef.getZoom()! > 15) {
          mapRef.setZoom(15);
        }
      });
      return () => {
        if (listener) window.google.maps.event.removeListener(listener);
      };

    } else if (mapRef) {
      mapRef.setCenter(defaultCenter);
      mapRef.setZoom(2);
    }
  }, [mapRef, validCities]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/30 rounded-xl">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Cargando mapa...</p>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={defaultCenter}
      zoom={2}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        zoomControl: true,
        clickableIcons: false,
      }}
    >
      {validCities.map((city) => (
        <MarkerF
          key={city.id || `${city.name}-${city.coordinates.lat}-${city.coordinates.lng}`}
          position={city.coordinates}
          onClick={() => setSelectedCity(city)}
          title={city.name}
        />
      ))}

      {selectedCity && selectedCity.coordinates && (
        <InfoWindowF
          position={selectedCity.coordinates}
          onCloseClick={() => setSelectedCity(null)}
          options={{ pixelOffset: new window.google.maps.Size(0, -30) }}
        >
          <div className="p-1">
            <h4 className="font-semibold text-sm text-primary">{selectedCity.name}</h4>
            <p className="text-xs text-muted-foreground">{selectedCity.country}</p>
          </div>
        </InfoWindowF>
      )}
    </GoogleMap>
  );
}
