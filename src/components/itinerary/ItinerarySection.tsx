
"use client";

import { useState, useEffect } from 'react';
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
  const [activities, setActivities] = useState<Activity[]>(() => 
    initialTripData.activities.sort((a, b) => {
      const dateComparison = a.date.localeCompare(b.date);
      if (dateComparison !== 0) return dateComparison;
      const timeComparison = a.time.localeCompare(b.time);
      if (timeComparison !== 0) return timeComparison;
      return (a.order ?? 0) - (b.order ?? 0);
    })
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const { toast } = useToast();

  const handleSetActivities = (updatedActivities: Activity[]) => {
    const sortedActivities = [...updatedActivities].sort((a, b) => {
        const dateComparison = a.date.localeCompare(b.date);
        if (dateComparison !== 0) return dateComparison;
        const timeComparison = a.time.localeCompare(b.time);
        if (timeComparison !== 0) return timeComparison;
        return (a.order ?? Date.now()) - (b.order ?? Date.now());
      });
    setActivities(sortedActivities);
  };
  
  const handleAddOrUpdateActivity = (activity: Activity) => {
    let updatedActivitiesList;
    // Ensure activity.id is final if it was a temp one
    const finalActivityId = activity.id && activity.id.startsWith('temp-') ? (editingActivity?.id || Date.now().toString()) : activity.id;

    const activityWithFinalId = { ...activity, id: finalActivityId };

    if (editingActivity) {
      updatedActivitiesList = activities.map(a => a.id === activityWithFinalId.id ? activityWithFinalId : a);
      toast({ title: "Actividad Actualizada", description: `"${activityWithFinalId.title}" ha sido actualizada.` });
    } else {
      const newActivityWithOrder = { ...activityWithFinalId, order: activityWithFinalId.order ?? Date.now() };
      updatedActivitiesList = [...activities, newActivityWithOrder];
      toast({ title: "Actividad Añadida", description: `"${activityWithFinalId.title}" ha sido añadida.` });
    }
    
    handleSetActivities(updatedActivitiesList);
    setEditingActivity(null);
    setIsFormOpen(false);
  };
  
  const handleOpenForm = (activity?: Activity) => {
    setEditingActivity(activity || null);
    setIsFormOpen(true);
  };

  const handleDeleteActivity = (activityId: string) => {
    const activityToDelete = activities.find(a => a.id === activityId);
    // TODO: Delete associated attachments from Firebase Storage if any
    const updatedActivities = activities.filter(a => a.id !== activityId);
    handleSetActivities(updatedActivities); 
    
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
        onSetActivities={handleSetActivities}
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
