
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Map, CheckSquare, ListChecks } from 'lucide-react';

interface QuickActionsProps {
  onViewFullItinerary?: () => void; // Make optional if not always needed
}

export default function QuickActions({ onViewFullItinerary }: QuickActionsProps) {
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
            onClick={() => alert('Próximamente: Añadir nuevo gasto (pre-seleccionando fecha de hoy y ciudad actual).')}
        >
          <PlusCircle size={18} className="mr-2" />
          Añadir Gasto
        </Button>
        <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => alert('Próximamente: Navegar a la sección de mapa, centrado en la ciudad actual.')}
        >
          <Map size={18} className="mr-2" />
          Ver Mapa de la Ciudad
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
            onClick={() => alert('Próximamente: Navegar a la sección de checklists de viaje.')}
        >
          <CheckSquare size={18} className="mr-2" />
          Ver Checklists
        </Button>
      </CardContent>
    </Card>
  );
}
