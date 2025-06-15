
import TripAppLayout from '@/components/layout/TripAppLayout';
import type { Metadata } from 'next';

// Metadata can be dynamic based on tripId in a real app
export const metadata: Metadata = {
  title: 'Detalles del Viaje',
  description: 'Gestiona los detalles de tu viaje.',
};

export default function LayoutForSpecificTrip({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { tripId: string };
}) {
  return <TripAppLayout tripId={params.tripId}>{children}</TripAppLayout>;
}
