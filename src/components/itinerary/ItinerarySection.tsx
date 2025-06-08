
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
  initialTripData: TripDetails; // Contiene datos estáticos como ciudades, fechas del viaje.
  activities: Activity[]; // Lista de actividades, gestionada por DashboardView
  onSetActivities: (activities: Activity[]) => void; // Función para actualizar la lista de actividades en DashboardView
}

export default function ItinerarySection({ initialTripData, activities, onSetActivities }: ItinerarySectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const { toast } = useToast();
  
  const handleAddOrUpdateActivity = (activity: Activity) => {
    let updatedActivitiesList;
    // Ensure activity.id is final if it was a temp one or missing
    const finalActivityId = activity.id && !activity.id.startsWith('temp-') 
                            ? activity.id 
                            : (editingActivity?.id && !editingActivity.id.startsWith('temp-') 
                                ? editingActivity.id 
                                : `act-${Date.now().toString()}`);

    const activityWithFinalId = { ...activity, id: finalActivityId };

    const existingActivity = activities.find(a => a.id === activityWithFinalId.id);

    if (existingActivity) { // Edit existing
      updatedActivitiesList = activities.map(a => a.id === activityWithFinalId.id ? activityWithFinalId : a);
      toast({ title: "Actividad Actualizada", description: `"${activityWithFinalId.title}" ha sido actualizada.` });
    } else { // Add new
      const newActivityWithOrder = { ...activityWithFinalId, order: activityWithFinalId.order ?? Date.now() };
      updatedActivitiesList = [...activities, newActivityWithOrder];
      toast({ title: "Actividad Añadida", description: `"${activityWithFinalId.title}" ha sido añadida.` });
    }
    
    onSetActivities(updatedActivitiesList); 
    setEditingActivity(null);
    setIsFormOpen(false);
  };
  
  const handleOpenForm = (activity?: Activity) => {
    setEditingActivity(activity || null);
    setIsFormOpen(true);
  };

  const handleDeleteActivity = (activityId: string) => {
    const activityToDelete = activities.find(a => a.id === activityId);
    const updatedActivities = activities.filter(a => a.id !== activityId);
    onSetActivities(updatedActivities); 
    
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
        onSetActivities={onSetActivities}
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
