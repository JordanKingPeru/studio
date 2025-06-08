
"use client";

import { useState } from 'react';
import type { TripDetails, Activity } from '@/lib/types';
import SectionCard from '@/components/ui/SectionCard';
import ActivityList from './ActivityList';
import ActivityForm from './ActivityForm';
import AISuggestionButton from '@/components/ai/AISuggestionButton';
import { Button } from '@/components/ui/button';
import { ListChecks, PlusCircle } from 'lucide-react';
// Toast is handled by DashboardView now

interface ItinerarySectionProps {
  initialTripData: TripDetails; // Contiene datos estáticos como ciudades, fechas del viaje.
  activities: Activity[]; // Lista de actividades, gestionada por DashboardView
  onAddOrUpdateActivity: (activity: Activity) => Promise<void>; // Función para actualizar/crear actividades en Firestore
  onSetActivities: (activities: Activity[]) => Promise<void>; // Función para actualizar la lista de actividades en Firestore (e.g., after DND)
  onDeleteActivity: (activityId: string) => Promise<void>; // Función para eliminar actividad de Firestore
}

export default function ItinerarySection({ 
  initialTripData, 
  activities, 
  onAddOrUpdateActivity,
  onSetActivities,
  onDeleteActivity
}: ItinerarySectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  
  const handleFormSubmit = async (activity: Activity) => {
    await onAddOrUpdateActivity(activity);
    setEditingActivity(null);
    setIsFormOpen(false);
  };
  
  const handleOpenForm = (activity?: Activity) => {
    setEditingActivity(activity || null);
    setIsFormOpen(true);
  };

  const handleDeleteActivityLocal = async (activityId: string) => {
    await onDeleteActivity(activityId);
    // No need to manually filter local state if DashboardView re-fetches or updates based on Firestore changes.
  };
  
  const headerActions = (
    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
      <AISuggestionButton 
        cities={initialTripData.ciudades} 
        tripFamilia={initialTripData.familia}
        tripDates={{ inicio: initialTripData.inicio, fin: initialTripData.fin }}
        onAddActivity={handleFormSubmit} // AI suggestions also go through the main submit handler
      />
      <Button onClick={() => handleOpenForm()} className="w-full sm:w-auto">
        <PlusCircle size={20} className="mr-2" />
        Añadir Actividad
      </Button>
    </div>
  );

  return (
    <SectionCard 
      id="itinerary" 
      title="Nuestro Itinerario" 
      icon={<ListChecks size={32} />}
      description="Plan detallado de actividades día por día."
      headerActions={headerActions}
    >
      <ActivityList 
        activities={activities} 
        tripData={initialTripData} 
        onEditActivity={handleOpenForm}
        onDeleteActivity={handleDeleteActivityLocal}
        onSetActivities={onSetActivities} // Pass this down for DND updates
      />
      <ActivityForm 
        isOpen={isFormOpen} 
        onClose={() => { setIsFormOpen(false); setEditingActivity(null); }} 
        onSubmit={handleFormSubmit}
        cities={initialTripData.ciudades}
        initialData={editingActivity}
      />
    </SectionCard>
  );
}
