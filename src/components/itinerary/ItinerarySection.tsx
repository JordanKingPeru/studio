
"use client";

import { useState } from 'react';
import type { TripDetails, Activity } from '@/lib/types';
import SectionCard from '@/components/ui/SectionCard';
import ActivityList from './ActivityList';
import ActivityForm from './ActivityForm';
import AISuggestionButton from '@/components/ai/AISuggestionButton';
import { Button } from '@/components/ui/button';
import { ListChecks, PlusCircle, RotateCcw } from 'lucide-react';

interface ItinerarySectionProps {
  tripData: TripDetails; 
  activities: Activity[]; 
  onAddOrUpdateActivity: (activity: Activity) => Promise<void>; 
  onSetActivities: (activities: Activity[]) => Promise<void>; 
  onDeleteActivity: (activityId: string) => Promise<void>; 
  tripId: string; 
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
  const [scrollToTodaySignal, setScrollToTodaySignal] = useState(0);
  
  const handleFormSubmit = async (activity: Activity) => {
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

  const triggerScrollToToday = () => {
    setScrollToTodaySignal(prev => prev + 1);
  };
  
  const headerActions = (
    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
       <Button onClick={triggerScrollToToday} variant="outline" className="w-full sm:w-auto">
        <RotateCcw size={18} className="mr-2" />
        Ir a Hoy
      </Button>
      <AISuggestionButton 
        cities={tripData.ciudades.filter(c => c.tripId === tripId)} 
        tripFamilia={tripData.familia || tripData.name}
        tripDates={{ inicio: tripData.startDate, fin: tripData.endDate }}
        onAddActivity={handleFormSubmit} 
        tripId={tripId} 
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
        tripId={tripId} 
        scrollToTodaySignal={scrollToTodaySignal}
      />
      <ActivityForm 
        isOpen={isFormOpen} 
        onClose={() => { setIsFormOpen(false); setEditingActivity(null); }} 
        onSubmit={handleFormSubmit}
        cities={tripData.ciudades.filter(c => c.tripId === tripId)}
        initialData={editingActivity}
        tripId={tripId} 
      />
    </SectionCard>
  );
}
