
"use client";

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, ListChecks, FileText } from 'lucide-react';

export default function TripMorePage() {
  const params = useParams();
  const tripId = params.tripId as string;

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="rounded-2xl shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary flex items-center gap-3">
            <MoreHorizontal className="h-8 w-8" />
            Más Opciones y Herramientas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            Esta sección se expandirá para incluir funcionalidades como checklists inteligentes, gestión de documentos y más, como se describe en las Fases 2 y 3 del plan.
          </p>
          
          <div className="p-6 bg-muted/30 rounded-xl shadow-inner">
            <h3 className="text-xl font-headline text-secondary-foreground mb-4 flex items-center">
              <Lightbulb size={22} className="mr-2 text-yellow-500" />
              Próximamente (Fase 3)
            </h3>
            <ul className="space-y-3 list-disc list-inside text-foreground/80">
              <li>
                <strong className="font-semibold text-foreground">Checklists Inteligentes:</strong> 
                Generadas por IA basadas en tu tipo de viaje y destino (Ej: "Viaje Familiar a la playa").
                <div className="ml-5 mt-1 p-2 bg-background/50 rounded-md text-sm">
                    <ListChecks size={16} className="inline mr-1.5 text-green-500" />
                    Ej: Bañadores, protector solar, pasaportes...
                </div>
              </li>
              <li>
                <strong className="font-semibold text-foreground">Gestión de Documentos:</strong> 
                Sube y organiza pasaportes, visas, reservas de hotel/vuelo.
                 <div className="ml-5 mt-1 p-2 bg-background/50 rounded-md text-sm">
                    <FileText size={16} className="inline mr-1.5 text-blue-500" />
                    Acceso rápido y seguro a tus documentos importantes.
                </div>
              </li>
               <li>
                <strong className="font-semibold text-foreground">Resumen del Viaje Post-Viaje:</strong> 
                Un carrusel de fotos con estadísticas compartibles.
              </li>
            </ul>
          </div>

          <p className="text-sm text-center text-muted-foreground pt-4">
            ID del Viaje Actual: {tripId}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
