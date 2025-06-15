
"use client";

import { useState } from 'react';
import type { TripDetails, Activity } from '@/lib/types';
import SectionCard from '@/components/ui/SectionCard';
import ActivityList from './ActivityList';
import ActivityForm from './ActivityForm';
import AISuggestionButton from '@/components/ai/AISuggestionButton';
import { Button } from '@/components/ui/button';
import { ListChecks, PlusCircle } from 'lucide-react';

interface ItinerarySectionProps {
  tripData: TripDetails; 
  activities: Activity[]; 
  onAddOrUpdateActivity: (activity: Activity) => Promise<void>; 
  onSetActivities: (activities: Activity[]) => Promise<void>; 
  onDeleteActivity: (activityId: string) => Promise<void>; 
  tripId: string; // Added tripId
}

export default function ItinerarySection({ 
  tripData, 
  activities, 
  onAddOrUpdateActivity,
  onSetActivities,
  onDeleteActivity,
  tripId 
}: ItinerarySectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  
  const handleFormSubmit = async (activity: Activity) => {
    // Ensure tripId is set for the activity before submission
    await onAddOrUpdateActivity({ ...activity, tripId });
    setEditingActivity(null);
    setIsFormOpen(false);
  };
  
  const handleOpenForm = (activity?: Activity) => {
    setEditingActivity(activity || null);
    setIsFormOpen(true);
  };

  const handleDeleteActivityLocal = async (activityId: string) => {
    await onDeleteActivity(activityId);
  };
  
  const headerActions = (
    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
      <AISuggestionButton 
        cities={tripData.ciudades} 
        tripFamilia={tripData.familia || "Familia"} // Use tripData.name or a default
        tripDates={{ inicio: tripData.startDate, fin: tripData.endDate }}
        onAddActivity={handleFormSubmit} 
        tripId={tripId} // Pass tripId to AI button
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
        tripData={tripData} 
        onEditActivity={handleOpenForm}
        onDeleteActivity={handleDeleteActivityLocal}
        onSetActivities={onSetActivities} 
        tripId={tripId} // Pass tripId
      />
      <ActivityForm 
        isOpen={isFormOpen} 
        onClose={() => { setIsFormOpen(false); setEditingActivity(null); }} 
        onSubmit={handleFormSubmit}
        cities={tripData.ciudades}
        initialData={editingActivity}
        tripId={tripId} // Pass tripId
      />
    </SectionCard>
  );
}
