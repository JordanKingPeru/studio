
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Map, CheckSquare, ListChecks } from 'lucide-react';
import { useRouter } from 'next/navigation'; // For navigation

interface QuickActionsProps {
  onViewFullItinerary?: () => void;
  tripId: string; // Added tripId
}

export default function QuickActions({ onViewFullItinerary, tripId }: QuickActionsProps) {
  const router = useRouter();

  const handleNavigateToMap = () => {
    // In a multi-trip context, this should navigate to the specific trip's map
    router.push(`/trips/${tripId}/map`);
  };
  
  const handleNavigateToChecklists = () => {
    // Navigate to the "More" section which will contain checklists
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
            // TODO: Implement Add Expense FAB in BudgetSection as per Phase 2.2
            onClick={() => alert('Próximamente: Añadir nuevo gasto (FAB en sección Presupuesto).')}
            disabled 
        >
          <PlusCircle size={18} className="mr-2" />
          Añadir Gasto
        </Button>
        <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={handleNavigateToMap} // Navigate to current trip's map
        >
          <Map size={18} className="mr-2" />
          Ver Mapa del Viaje
        </Button>
        {onViewFullItinerary && (
           <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={onViewFullItinerary}
            >
            <ListChecks size={18} className="mr-2" />
            Ver Itinerario Completo
          </Button>
        )}
        <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={handleNavigateToChecklists} // Navigate to "More" section for checklists
        >
          <CheckSquare size={18} className="mr-2" />
          Ver Checklists / Más
        </Button>
      </CardContent>
    </Card>
  );
}
