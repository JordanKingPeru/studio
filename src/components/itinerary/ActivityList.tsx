
"use client";

import type { Activity, ItineraryDay, TripDetails, ItineraryWeek } from '@/lib/types';
import ActivityCard from './ActivityCard';
import {
  startOfWeek, endOfWeek, eachDayOfInterval, format, parseISO,
  isWithinInterval, addDays, isBefore, isAfter, addHours, subHours
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Card } from '@/components/ui/card'; 
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Plane, Briefcase, CalendarRange, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface ActivityListProps {
  activities: Activity[];
  tripData: TripDetails;
  onEditActivity: (activity: Activity) => void;
  onDeleteActivity: (activityId: string) => void;
  onSetActivities: (activities: Activity[]) => void; // For updating order after DND
}

const groupActivitiesByWeekAndDay = (
  activities: Activity[],
  tripData: TripDetails
): ItineraryWeek[] => {
  const weeks: ItineraryWeek[] = [];
  if (!tripData.inicio || !tripData.fin) return weeks;

  const tripStartDate = parseISO(tripData.inicio);
  const tripEndDate = parseISO(tripData.fin);
  const today = new Date(); 

  if (isBefore(tripEndDate, tripStartDate)) return weeks;

  let currentIteratingMonday = startOfWeek(tripStartDate, { weekStartsOn: 1 });
  const firstTripWeekStartDateStr = format(startOfWeek(tripStartDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  while (!isAfter(currentIteratingMonday, tripEndDate)) {
    const weekStartDate = currentIteratingMonday;
    const weekEndDate = endOfWeek(currentIteratingMonday, { weekStartsOn: 1 });
    const weekStartDateStr = format(weekStartDate, 'yyyy-MM-dd');

    const weekLabelFull = `Semana del ${format(weekStartDate, "d 'de' MMM.", { locale: es })} al ${format(weekEndDate, "d 'de' MMM. 'de' yyyy", { locale: es })}`;
    const weekLabelShort = `Sem: ${format(weekStartDate, "d MMM.", { locale: es })} - ${format(weekEndDate, "d MMM. yy", { locale: es })}`;


    const daysInThisWeek: ItineraryDay[] = [];
    const daysInterval = eachDayOfInterval({ start: weekStartDate, end: weekEndDate });

    for (const dayDate of daysInterval) {
      if (!isWithinInterval(dayDate, { start: tripStartDate, end: tripEndDate })) {
        continue;
      }
      const dateStr = format(dayDate, 'yyyy-MM-dd');
      const activitiesForDay = activities
        .filter(act => act.date === dateStr)
        .sort((a, b) => {
          const timeComparison = a.time.localeCompare(b.time);
          if (timeComparison !== 0) return timeComparison;
          return (a.order ?? 0) - (b.order ?? 0); 
        });

      const currentCity = tripData.ciudades.find(c =>
        !isBefore(dayDate, parseISO(c.arrivalDate)) && !isAfter(dayDate, parseISO(c.departureDate))
      );
      const cityInfo = currentCity ? `${currentCity.name}, ${currentCity.country}` : 'En tránsito / Sin ciudad asignada';
      const isTravelDay = tripData.ciudades.some(c => c.arrivalDate === dateStr || c.departureDate === dateStr);
      const isWorkDay = tripData.trabajo_ini && tripData.trabajo_fin &&
        !isBefore(dayDate, parseISO(tripData.trabajo_ini)) &&
        !isAfter(dayDate, parseISO(tripData.trabajo_fin));

      daysInThisWeek.push({
        date: dateStr,
        cityInfo,
        activities: activitiesForDay,
        isWorkDay: !!isWorkDay,
        isTravelDay: !!isTravelDay,
      });
    }

    if (daysInThisWeek.length > 0) {
      const totalWeeklyCost = daysInThisWeek.reduce((sum, day) =>
        sum + day.activities.reduce((daySum, act) => daySum + (act.cost || 0), 0), 0);

      let isDefaultExpanded = false;
      if (isBefore(today, tripStartDate)) { 
        if (weekStartDateStr === firstTripWeekStartDateStr) {
          isDefaultExpanded = true;
        }
      } else if (!isAfter(today, tripEndDate)) { 
        if (isWithinInterval(today, { start: weekStartDate, end: weekEndDate })) {
          isDefaultExpanded = true;
        }
      }
      
      weeks.push({
        weekStartDate: weekStartDateStr,
        weekEndDate: format(weekEndDate, 'yyyy-MM-dd'),
        weekLabel: weekLabelFull, 
        weekLabelShort: weekLabelShort, 
        days: daysInThisWeek,
        totalWeeklyCost,
        isDefaultExpanded,
      });
    }
    currentIteratingMonday = addDays(currentIteratingMonday, 7);
  }
  return weeks;
};


export default function ActivityList({ activities, tripData, onEditActivity, onDeleteActivity, onSetActivities }: ActivityListProps) {
  const [processedWeeks, setProcessedWeeks] = useState<ItineraryWeek[]>([]);
  const [openWeekKeys, setOpenWeekKeys] = useState<string[]>([]);
  const [openDayKeys, setOpenDayKeys] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const newProcessedWeeks = groupActivitiesByWeekAndDay(activities, tripData);
    setProcessedWeeks(newProcessedWeeks);

    const defaultOpenWeeks = newProcessedWeeks
      .filter(week => week.isDefaultExpanded)
      .map(week => week.weekStartDate);
    setOpenWeekKeys(defaultOpenWeeks);
  }, [activities, tripData]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active && over && active.id !== over.id) {
      const activeId = active.id as string;
      const overId = over.id as string; // Can be an activity ID or a day's droppable area ID (format: `day-${dateStr}`)

      // Find which day the active item belongs to
      let activeDay: ItineraryDay | undefined;
      let activeDayActivities: Activity[] = [];
      
      for (const week of processedWeeks) {
        for (const day of week.days) {
          if (day.activities.find(act => act.id === activeId)) {
            activeDay = day;
            activeDayActivities = [...day.activities]; // Operate on a copy
            break;
          }
        }
        if (activeDay) break;
      }

      if (!activeDay) return;

      const oldIndex = activeDayActivities.findIndex(act => act.id === activeId);
      
      // Check if `over.id` corresponds to an activity within the same day, or the day container itself
      let newIndexInDay: number;
      const overIsActivity = activeDayActivities.some(act => act.id === overId);

      if (overIsActivity) {
        newIndexInDay = activeDayActivities.findIndex(act => act.id === overId);
      } else if (over.id === `day-${activeDay.date}`) {
        // Dropped onto the day container, assume end of list or determine based on coordinates (complex)
        // For simplicity, let's assume it's dropped at the end if not over another activity
        newIndexInDay = activeDayActivities.length -1; 
      } else {
        // Dropped somewhere unexpected, or over a different day (not yet supported)
        return;
      }


      if (oldIndex === -1 || newIndexInDay === -1) return;
      
      // 1. Reorder activities for the specific day
      const reorderedDayActivities = arrayMove(activeDayActivities, oldIndex, newIndexInDay);
      const movedActivity = reorderedDayActivities.find(a => a.id === activeId)!;

      // 2. Adjust time of the moved activity
      const movedActivityCurrentIndex = reorderedDayActivities.findIndex(a => a.id === activeId);
      let newTime = movedActivity.time;

      if (movedActivityCurrentIndex > 0) { // Has a previous activity
        const prevActivity = reorderedDayActivities[movedActivityCurrentIndex - 1];
        const prevActivityDateTime = parseISO(`${activeDay.date}T${prevActivity.time}`);
        newTime = format(addHours(prevActivityDateTime, 1), 'HH:mm');
      } else if (reorderedDayActivities.length > 1) { // Is first, and has a next activity
        const nextActivity = reorderedDayActivities[movedActivityCurrentIndex + 1];
        const nextActivityDateTime = parseISO(`${activeDay.date}T${nextActivity.time}`);
        newTime = format(subHours(nextActivityDateTime, 1), 'HH:mm');
      }
      // Ensure time is valid (e.g., not negative after subtraction)
      // For simplicity, we assume valid positive times for now.
      // Date-fns handles wrap-around for add/sub hours if it crosses midnight, but HH:mm format keeps it within the day.

      // 3. Update the moved activity and re-assign order for all activities in that day
      const finalDayActivities = reorderedDayActivities.map((act, index) => {
        if (act.id === activeId) {
          return { ...act, time: newTime, order: index * 10 };
        }
        return { ...act, order: index * 10 };
      });
      
      // 4. Update the global activities list
      const updatedGlobalActivities = activities.map(act => {
        const updatedActInDay = finalDayActivities.find(fa => fa.id === act.id);
        if (act.date === activeDay?.date && updatedActInDay) {
          return updatedActInDay;
        }
        return act;
      }).sort((a, b) => { // Re-sort global list
        const dateComparison = a.date.localeCompare(b.date);
        if (dateComparison !== 0) return dateComparison;
        const timeComparison = a.time.localeCompare(b.time);
        if (timeComparison !== 0) return timeComparison;
        return (a.order ?? 0) - (b.order ?? 0);
      });
      
      onSetActivities(updatedGlobalActivities);
    }
  };


  const handleToggleAllWeeks = (expand: boolean) => {
    if (expand) {
      setOpenWeekKeys(processedWeeks.map(w => w.weekStartDate));
    } else {
      setOpenWeekKeys([]);
      setOpenDayKeys({}); 
    }
  };

  const handleDayAccordionChange = (weekKey: string, newOpenDays: string[]) => {
    setOpenDayKeys(prev => ({ ...prev, [weekKey]: newOpenDays }));
  };

  if (processedWeeks.length === 0 && activities.length > 0) {
     return <p className="text-muted-foreground text-center py-8">Procesando itinerario...</p>;
  }
  if (processedWeeks.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No hay actividades planificadas todavía.</p>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-end gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={() => handleToggleAllWeeks(true)}>
            <ChevronDown className="mr-2 h-4 w-4" /> Expandir Semanas
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleToggleAllWeeks(false)}>
            <ChevronUp className="mr-2 h-4 w-4" /> Colapsar Semanas
          </Button>
        </div>
        <Accordion type="multiple" value={openWeekKeys} onValueChange={setOpenWeekKeys} className="w-full space-y-4">
          {processedWeeks.map((week) => (
            <AccordionItem key={week.weekStartDate} value={week.weekStartDate} className="border-none">
              <Card className="rounded-2xl shadow-lg overflow-hidden bg-card">
                <AccordionTrigger className="w-full px-4 py-3 sm:px-6 sm:py-4 hover:no-underline data-[state=closed]:hover:bg-muted/40 data-[state=open]:hover:bg-muted/70 rounded-t-2xl transition-colors data-[state=open]:bg-muted/50 data-[state=closed]:bg-muted/20">
                  <div className="flex justify-between items-center w-full">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <CalendarRange size={20} className="text-primary shrink-0 sm:size-22" />
                      <div className="text-left">
                          <span className="font-headline text-sm sm:text-base md:text-lg text-primary hidden sm:inline">{week.weekLabel}</span>
                          <span className="font-headline text-sm text-primary sm:hidden">{week.weekLabelShort}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 shrink-0 ml-2">
                      <Badge variant="secondary" className="text-xs sm:text-sm whitespace-nowrap">
                        Gastos: {week.totalWeeklyCost.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-0">
                  <div className="border-t border-border p-2 sm:p-4 md:p-6">
                    {week.days.length > 0 ? (
                      <Accordion
                        type="multiple"
                        value={openDayKeys[week.weekStartDate] || week.days.filter(d => d.activities.length > 0).map(d => d.date)} // Expand days with activities by default
                        onValueChange={(days) => handleDayAccordionChange(week.weekStartDate, days)}
                        className="w-full space-y-2"
                      >
                        {week.days.map((day) => {
                          const dayActivityIds = day.activities.map(act => act.id);
                          return (
                            <AccordionItem key={day.date} value={day.date} className="border-none">
                              <Card className="rounded-xl shadow-md overflow-hidden bg-background">
                                <AccordionTrigger className="w-full px-3 py-2 sm:px-4 sm:py-3 hover:no-underline data-[state=closed]:hover:bg-accent/10 data-[state=open]:hover:bg-accent/20 data-[state=open]:bg-accent/10 rounded-t-xl transition-colors">
                                  <div className="flex justify-between items-center w-full">
                                    <div className="flex items-center gap-2">
                                      <CalendarDays size={18} className="text-secondary-foreground shrink-0" />
                                      <span className="font-semibold text-sm sm:text-md text-secondary-foreground text-left">
                                        {format(parseISO(day.date), "EEEE, d 'de' MMMM", { locale: es })}
                                      </span>
                                    </div>
                                    <div className="text-xs font-normal text-muted-foreground flex items-center gap-1 sm:gap-2 shrink-0 ml-2">
                                      {day.isTravelDay && <Plane size={14} className="text-blue-500" />}
                                      {day.isWorkDay && <Briefcase size={14} className="text-green-500" />}
                                      <span className="truncate max-w-[80px] xs:max-w-[100px] sm:max-w-[150px] md:max-w-xs text-right">{day.cityInfo}</span>
                                    </div>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-0">
                                  <div className="border-t border-border p-2 sm:p-3 md:p-4">
                                    <SortableContext items={dayActivityIds} strategy={verticalListSortingStrategy}>
                                      {day.activities.length > 0 ? (
                                        day.activities.map(activity => (
                                          <ActivityCard
                                            key={activity.id}
                                            activity={activity}
                                            onEdit={onEditActivity}
                                            onDelete={onDeleteActivity}
                                          />
                                        ))
                                      ) : (
                                        <p className="text-muted-foreground text-sm py-3 px-1">Día libre o sin actividades específicas.</p>
                                      )}
                                    </SortableContext>
                                  </div>
                                </AccordionContent>
                              </Card>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No hay días planificados en esta semana.</p>
                    )}
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </DndContext>
  );
}

