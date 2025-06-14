
"use client";

import type { ReactNode } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';

interface ClientProvidersProps {
  children: ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!googleMapsApiKey) {
    console.warn(
      "ADVERTENCIA: La API Key de Google Maps (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) no está definida. La funcionalidad de los mapas estará limitada o deshabilitada. Asegúrate de tener esta variable en tu archivo .env y que el nombre sea correcto."
    );
    // Aquí podrías optar por renderizar un fallback o simplemente los children
    // si deseas que la app funcione parcialmente sin mapas.
    // Por ahora, procederemos y dejaremos que @vis.gl/react-google-maps maneje la clave faltante,
    // lo que usualmente resulta en un mapa deshabilitado o con errores.
  }

  return (
    <APIProvider apiKey={googleMapsApiKey || ""}>
      {children}
    </APIProvider>
  );
}
