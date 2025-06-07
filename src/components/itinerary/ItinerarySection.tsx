"use client";

import { useState } from 'react';
import type { TripDetails, Activity } from '@/lib/types';
import SectionCard from '@/components/ui/SectionCard';
import ActivityList from './ActivityList';
import ActivityForm from './ActivityForm';
import AISuggestionButton from '@/components/ai/AISuggestionButton';
import { Button } from '@/components/ui/button';
import { ListChecks, PlusCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface ItinerarySectionProps {
  initialTripData: TripDetails;
}

export default function ItinerarySection({ initialTripData }: ItinerarySectionProps) {
  const [activities, setActivities] = useState<Activity[]>(initialTripData.activities);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const { toast } = useToast();

  const handleAddOrUpdateActivity = (activity: Activity) => {
    if (editingActivity) {
      setActivities(prev => prev.map(a => a.id === activity.id ? activity : a));
      toast({ title: "Actividad Actualizada", description: `"${activity.title}" ha sido actualizada.` });
    } else {
      setActivities(prev => [...prev, activity].sort((a,b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)));
      toast({ title: "Actividad Añadida", description: `"${activity.title}" ha sido añadida.` });
    }
    setEditingActivity(null);
    setIsFormOpen(false);
  };
  
  const handleOpenForm = (activity?: Activity) => {
    setEditingActivity(activity || null);
    setIsFormOpen(true);
  };

  const handleDeleteActivity = (activityId: string) => {
    const activityToDelete = activities.find(a => a.id === activityId);
    setActivities(prev => prev.filter(a => a.id !== activityId));
    if (activityToDelete) {
      toast({ 
        title: "Actividad Eliminada", 
        description: `"${activityToDelete.title}" ha sido eliminada.`,
        variant: "destructive" 
      });
    }
  };
  
  const headerActions = (
    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
      <AISuggestionButton 
        cities={initialTripData.ciudades} 
        tripFamilia={initialTripData.familia}
        tripDates={{ inicio: initialTripData.inicio, fin: initialTripData.fin }}
        onAddActivity={handleAddOrUpdateActivity} 
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
        onDeleteActivity={handleDeleteActivity}
      />
      <ActivityForm 
        isOpen={isFormOpen} 
        onClose={() => { setIsFormOpen(false); setEditingActivity(null); }} 
        onSubmit={handleAddOrUpdateActivity}
        cities={initialTripData.ciudades}
        initialData={editingActivity}
      />
    </SectionCard>
  );
}
