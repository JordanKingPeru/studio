
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Map, CheckSquare, ListChecks } from 'lucide-react';
import { useRouter } from 'next/navigation'; 

interface QuickActionsProps {
  onViewFullItinerary?: () => void; // This will navigate to itinerary page now
  tripId: string; 
}

export default function QuickActions({ onViewFullItinerary, tripId }: QuickActionsProps) {
  const router = useRouter();

  const handleNavigateToMap = () => {
    router.push(`/trips/${tripId}/map`);
  };
  
  const handleNavigateToChecklists = () => {
    router.push(`/trips/${tripId}/more`);
  };


  return (
    <Card className="rounded-xl shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl text-primary">
          Acciones Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button 
            variant="outline" 
            className="w-full justify-start" 
            onClick={() => alert('Funcionalidad movida al FAB en la sección de Presupuesto.')} // Updated message
            disabled // Keep disabled as per Phase 2.2 (FAB in BudgetSection)
        >
          <PlusCircle size={18} className="mr-2" />
          Añadir Gasto
        </Button>
        <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={handleNavigateToMap} 
        >
          <Map size={18} className="mr-2" />
          Ver Mapa del Viaje
        </Button>
        {onViewFullItinerary && (
           <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={onViewFullItinerary} // This prop will now trigger navigation
            >
            <ListChecks size={18} className="mr-2" />
            Ver Itinerario Completo
          </Button>
        )}
        <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={handleNavigateToChecklists} 
        >
          <CheckSquare size={18} className="mr-2" />
          Ver Checklists / Más
        </Button>
      </CardContent>
    </Card>
  );
}
