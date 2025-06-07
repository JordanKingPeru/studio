"use client";
import type { TripDetails } from '@/lib/types';
import SectionCard from '@/components/ui/SectionCard';
import { CalendarHeart, CalendarCheck2, Briefcase, Plane } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

interface CalendarSectionProps {
  tripData: TripDetails;
}

export default function CalendarSection({ tripData }: CalendarSectionProps) {
  const keyMilestones = [
    { date: tripData.inicio, label: 'Inicio del Viaje', icon: <Plane size={18} className="text-green-500" />, type: 'trip' },
    tripData.trabajo_ini && { date: tripData.trabajo_ini, label: 'Inicio Periodo Laboral', icon: <Briefcase size={18} className="text-blue-500" />, type: 'work' },
    tripData.trabajo_fin && { date: tripData.trabajo_fin, label: 'Fin Periodo Laboral', icon: <Briefcase size={18} className="text-blue-500" />, type: 'work' },
    ...tripData.ciudades.map(city => ({ date: city.arrivalDate, label: `Llegada a ${city.name}`, icon: <Plane size={18} className="text-purple-500" />, type: 'city' })),
    { date: tripData.fin, label: 'Fin del Viaje', icon: <CalendarCheck2 size={18} className="text-red-500" />, type: 'trip' },
  ].filter(Boolean).sort((a,b) => parseISO(a!.date).getTime() - parseISO(b!.date).getTime());


  return (
    <SectionCard 
      id="calendar" 
      title="Calendario de Hitos" 
      icon={<CalendarHeart size={32} />}
      description="Fechas clave y eventos importantes de nuestro viaje."
    >
      <div className="space-y-6">
        <div className="p-6 bg-muted/30 rounded-xl shadow-inner">
          <h3 className="text-xl font-headline text-secondary-foreground mb-4">Hitos Importantes</h3>
          <ul className="space-y-3">
            {keyMilestones.map((milestone, index) => milestone && (
              <li key={index} className="flex items-center justify-between p-3 bg-card rounded-lg shadow-sm">
                <div className="flex items-center">
                  <span className="mr-3">{milestone.icon}</span>
                  <div>
                    <p className="font-semibold text-foreground">{milestone.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(milestone.date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
                <Badge variant={milestone.type === 'trip' ? 'default' : milestone.type === 'work' ? 'secondary' : 'outline' } className="capitalize">
                  {milestone.type === 'trip' ? 'Viaje' : milestone.type === 'work' ? 'Trabajo' : 'Ciudad'}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
        <div className="text-center p-4 border-2 border-dashed border-border rounded-lg">
          <p className="text-muted-foreground">
            Integración con calendario completo (ej. react-big-calendar) y exportación a Google Calendar / .ics próximamente.
          </p>
          <img data-ai-hint="calendar schedule" src="https://placehold.co/600x300.png" alt="Placeholder for a calendar view" className="mt-4 rounded-md mx-auto opacity-50" />
        </div>
      </div>
    </SectionCard>
  );
}
