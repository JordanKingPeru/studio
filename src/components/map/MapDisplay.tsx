
"use client";

import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L, { type LatLngExpression, type LatLngBoundsExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { City } from '@/lib/types';

// Configure Leaflet's default icon paths to use images from the public folder
// This should run once when the module is loaded on the client side.
if (typeof window !== 'undefined') {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl; // Recommended by Leaflet to avoid issues with Webpack
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: '/leaflet-images/marker-icon-2x.png',
    iconUrl: '/leaflet-images/marker-icon.png',
    shadowUrl: '/leaflet-images/marker-shadow.png',
  });
}


interface MapDisplayProps {
  cities: City[];
}

const defaultPosition: LatLngExpression = [20, 0]; // A general world view
const defaultZoom = 2;

// Component to dynamically change map view
function ChangeView({ bounds }: { bounds: LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (map.getZoom() < defaultZoom +1 ) { // Only reset to default if not already zoomed in by user
        map.setView(defaultPosition, defaultZoom);
    }
  }, [bounds, map]);
  return null;
}

export default function MapDisplay({ cities }: MapDisplayProps) {
  const validCities = useMemo(() => cities.filter(city => 
    typeof city.coordinates?.lat === 'number' && typeof city.coordinates?.lng === 'number' &&
    !(city.coordinates.lat === 0 && city.coordinates.lng === 0) // Optionally exclude (0,0) if considered invalid
  ), [cities]);

  const mapBounds = useMemo((): LatLngBoundsExpression | null => {
    if (validCities.length === 0) return null;
    if (validCities.length === 1) {
        const city = validCities[0];
        // For a single city, create a small "bounds" around it or just center on it
        return L.latLng(city.coordinates.lat, city.coordinates.lng).toBounds(10000); // 10km radius bounds
    }
    const lats = validCities.map(city => city.coordinates.lat);
    const lngs = validCities.map(city => city.coordinates.lng);
    return L.latLngBounds(
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    );
  }, [validCities]);

  const mapKey = useMemo(() => validCities.map(c => c.id).join('_') || 'initial-map', [validCities]);

  return (
    <MapContainer
      key={mapKey} // Change key to force re-render if city list changes drastically
      center={defaultPosition}
      zoom={defaultZoom}
      scrollWheelZoom={true}
      style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }}
      className="min-h-[400px] md:min-h-[500px]"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {validCities.map(city => (
        <Marker key={city.id} position={[city.coordinates.lat, city.coordinates.lng]}>
          <Popup>
            <span className="font-semibold">{city.name}</span>, {city.country}
          </Popup>
        </Marker>
      ))}
      <ChangeView bounds={mapBounds} />
    </MapContainer>
  );
}
