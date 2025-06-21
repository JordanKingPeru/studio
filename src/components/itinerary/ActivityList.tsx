
"use client";

import type { Activity, ItineraryDay, TripDetails, ItineraryWeek } from '@/lib/types';
import ActivityCard from './ActivityCard';
import {
  startOfWeek, endOfWeek, eachDayOfInterval, format, parseISO,
  isWithinInterval, addDays, isBefore, isAfter, addHours, subHours, isToday as dateFnsIsToday
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Card } from '@/components/ui/card'; 
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Plane, Briefcase, CalendarRange, ChevronDown, ChevronUp, PlusCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
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
import AISuggestionButton from '../ai/AISuggestionButton';

interface ActivityListProps {
  activities: Activity[];
  tripData: TripDetails;
  onEditActivity: (activity: Partial<Activity>) => void;
  onDeleteActivity: (activityId: string) => void;
  onSetActivities: (activities: Activity[]) => void; 
  tripId: string; 
  scrollToTodaySignal: number;
  onAddOrUpdateActivity: (activity: Activity) => Promise<void>;
}

const groupActivitiesByWeekAndDay = (
  activities: Activity[],
  tripData: TripDetails
): ItineraryWeek[] => {
  const weeks: ItineraryWeek[] = [];
  if (!tripData.startDate || !tripData.endDate) return weeks;

  const tripStartDate = parseISO(tripData.startDate);
  const tripEndDate = parseISO(tripData.endDate);
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
        .filter(act => act.date === dateStr && act.tripId === tripData.id) 
        .sort((a, b) => {
          const timeComparison = a.time.localeCompare(b.time);
          if (timeComparison !== 0) return timeComparison;
          return (a.order ?? 0) - (b.order ?? 0); 
        });

      const currentCity = tripData.ciudades.find(c =>
        c.tripId === tripData.id && 
        !isBefore(dayDate, parseISO(c.arrivalDate)) && !isAfter(dayDate, parseISO(c.departureDate))
      );
      const cityInfo = currentCity ? `${currentCity.name}, ${currentCity.country}` : 'En tránsito / Sin ciudad asignada';
      const isTravelDay = tripData.ciudades.some(c => c.tripId === tripData.id && (c.arrivalDate === dateStr || c.departureDate === dateStr));
      
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
      if (isWithinInterval(today, { start: weekStartDate, end: weekEndDate })) {
        isDefaultExpanded = true;
      }
      else if (isBefore(today, tripStartDate) && weekStartDateStr === firstTripWeekStartDateStr) {
          isDefaultExpanded = true;
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


export default function ActivityList({ activities, tripData, onEditActivity, onDeleteActivity, onSetActivities, tripId, scrollToTodaySignal, onAddOrUpdateActivity }: ActivityListProps) {
  const [processedWeeks, setProcessedWeeks] = useState<ItineraryWeek[]>([]);
  const [openWeekKeys, setOpenWeekKeys] = useState<string[]>([]);
  const [openDayKeys, setOpenDayKeys] = useState<Record<string, string[]>>({});
  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({});


  useEffect(() => {
    const newProcessedWeeks = groupActivitiesByWeekAndDay(activities, tripData);
    setProcessedWeeks(newProcessedWeeks);

    const defaultOpenWeeks = newProcessedWeeks
      .filter(week => week.isDefaultExpanded)
      .map(week => week.weekStartDate);
    setOpenWeekKeys(defaultOpenWeeks);

    const initialOpenDays: Record<string, string[]> = {};
    defaultOpenWeeks.forEach(weekKey => {
      const week = newProcessedWeeks.find(w => w.weekStartDate === weekKey);
      if (week) {
        initialOpenDays[weekKey] = week.days
          .filter(d => d.activities.length > 0 || dateFnsIsToday(parseISO(d.date)))
          .map(d => d.date);
      }
    });
    setOpenDayKeys(initialOpenDays);

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
      const overId = over.id as string; 

      let activeDay: ItineraryDay | undefined;
      let activeDayActivities: Activity[] = [];
      
      for (const week of processedWeeks) {
        for (const day of week.days) {
          if (day.activities.find(act => act.id === activeId)) {
            activeDay = day;
            activeDayActivities = [...day.activities]; 
            break;
          }
        }
        if (activeDay) break;
      }

      if (!activeDay) return;

      const oldIndex = activeDayActivities.findIndex(act => act.id === activeId);
      
      let newIndexInDay: number;
      const overIsActivity = activeDayActivities.some(act => act.id === overId);

      if (overIsActivity) {
        newIndexInDay = activeDayActivities.findIndex(act => act.id === overId);
      } else if (over.id === `day-${activeDay.date}`) {
        newIndexInDay = activeDayActivities.length -1; 
      } else {
        return;
      }

      if (oldIndex === -1 || newIndexInDay === -1) return;
      
      const reorderedDayActivities = arrayMove(activeDayActivities, oldIndex, newIndexInDay);
      const movedActivity = reorderedDayActivities.find(a => a.id === activeId)!;

      const movedActivityCurrentIndex = reorderedDayActivities.findIndex(a => a.id === activeId);
      let newTime = movedActivity.time;

      if (movedActivityCurrentIndex > 0) { 
        const prevActivity = reorderedDayActivities[movedActivityCurrentIndex - 1];
        const prevActivityDateTime = parseISO(`${activeDay.date}T${prevActivity.time}`);
        newTime = format(addHours(prevActivityDateTime, 1), 'HH:mm');
      } else if (reorderedDayActivities.length > 1) { 
        const nextActivity = reorderedDayActivities[movedActivityCurrentIndex + 1];
        const nextActivityDateTime = parseISO(`${activeDay.date}T${nextActivity.time}`);
        newTime = format(subHours(nextActivityDateTime, 1), 'HH:mm');
      }
      
      const finalDayActivities = reorderedDayActivities.map((act, index) => {
        if (act.id === activeId) {
          return { ...act, time: newTime, order: index * 10, tripId }; 
        }
        return { ...act, order: index * 10, tripId }; 
      });
      
      const updatedGlobalActivities = activities.map(act => {
        const updatedActInDay = finalDayActivities.find(fa => fa.id === act.id);
        if (act.date === activeDay?.date && updatedActInDay) {
          return { ...updatedActInDay, tripId }; 
        }
        return { ...act, tripId }; 
      }).sort((a, b) => { 
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
      const allOpenDays: Record<string, string[]> = {};
      processedWeeks.forEach(week => {
        allOpenDays[week.weekStartDate] = week.days.filter(d => d.activities.length > 0).map(d => d.date);
      });
      setOpenDayKeys(allOpenDays);
    } else {
      setOpenWeekKeys([]);
      setOpenDayKeys({}); 
    }
  };

  const handleDayAccordionChange = (weekKey: string, newOpenDays: string[]) => {
    setOpenDayKeys(prev => ({ ...prev, [weekKey]: newOpenDays }));
  };

  const attemptScrollToToday = () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayElement = dayRefs.current[`day-card-${todayStr}`];

    if (todayElement) {
      const weekOfToday = processedWeeks.find(w => w.days.some(d => d.date === todayStr));
      if (weekOfToday) {
        if (!openWeekKeys.includes(weekOfToday.weekStartDate)) {
          setOpenWeekKeys(prevOpenWeeks => {
            const newOpenWeeks = [...prevOpenWeeks, weekOfToday.weekStartDate];
            setOpenDayKeys(prevOpenDays => ({
              ...prevOpenDays,
              [weekOfToday.weekStartDate]: Array.from(new Set([...(prevOpenDays[weekOfToday.weekStartDate] || []), todayStr]))
            }));
            return newOpenWeeks;
          });
        } else {
          setOpenDayKeys(prevOpenDays => ({
            ...prevOpenDays,
            [weekOfToday.weekStartDate]: Array.from(new Set([...(prevOpenDays[weekOfToday.weekStartDate] || []), todayStr]))
          }));
        }
        
        setTimeout(() => {
          todayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300); 
      }
    } else {
      console.log("El día de hoy no está en el itinerario o no tiene actividades visibles para hacer scroll.");
    }
  };
  
  useEffect(() => {
    if (processedWeeks.length > 0) {
        attemptScrollToToday();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processedWeeks]);

  useEffect(() => {
    if (scrollToTodaySignal > 0 && processedWeeks.length > 0) {
      attemptScrollToToday();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollToTodaySignal]);


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
        <div className="flex flex-col sm:flex-row justify-end items-center gap-2 mb-4 sticky top-0 bg-background/80 backdrop-blur-sm py-2 z-10">
            <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={() => handleToggleAllWeeks(true)} className="flex-1 sm:flex-initial">
                    <ChevronDown className="mr-2 h-4 w-4" /> Expandir Todo
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleToggleAllWeeks(false)} className="flex-1 sm:flex-initial">
                    <ChevronUp className="mr-2 h-4 w-4" /> Colapsar Todo
                </Button>
            </div>
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
                        value={openDayKeys[week.weekStartDate] || []} 
                        onValueChange={(days) => handleDayAccordionChange(week.weekStartDate, days)}
                        className="w-full space-y-2"
                      >
                        {week.days.map((day) => {
                          const dayActivityIds = day.activities.map(act => act.id);
                          return (
                            <AccordionItem 
                                key={day.date} 
                                value={day.date} 
                                id={`day-card-${day.date}`} 
                                ref={el => dayRefs.current[`day-card-${day.date}`] = el}
                                className="border-none"
                            >
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
                                            onEdit={() => onEditActivity(activity)}
                                            onDelete={onDeleteActivity}
                                          />
                                        ))
                                      ) : (
                                        <p className="text-muted-foreground text-sm py-3 px-1">Día libre o sin actividades específicas.</p>
                                      )}
                                    </SortableContext>
                                    <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center border-t border-dashed pt-4">
                                      <Button 
                                          variant="outline" 
                                          size="sm" 
                                          className="w-full sm:w-auto"
                                          onClick={() => {
                                              const lastActivity = day.activities.length > 0 ? day.activities[day.activities.length - 1] : null;
                                              let newTime = '09:00';
                                              if (lastActivity && lastActivity.time) {
                                                  try {
                                                      const [hours, minutes] = lastActivity.time.split(':').map(Number);
                                                      const lastActivityDate = new Date();
                                                      lastActivityDate.setHours(hours + 1, minutes, 0, 0);
                                                      newTime = format(lastActivityDate, 'HH:mm');
                                                  } catch(e) { console.error("Could not parse time", e); }
                                              }
                                              
                                              const newActivityPartial: Partial<Activity> = {
                                                  date: day.date,
                                                  time: newTime,
                                                  city: day.cityInfo.split(',')[0].trim() || tripData.ciudades.find(c => c.tripId === tripId)?.[0]?.name || '',
                                              };
                                              onEditActivity(newActivityPartial);
                                          }}
                                      >
                                          <PlusCircle size={16} className="mr-2" />
                                          Añadir Actividad
                                      </Button>
                                      <AISuggestionButton 
                                          cities={tripData.ciudades.filter(c => c.tripId === tripId)}
                                          tripFamilia={tripData.familia || tripData.name}
                                          tripDates={{ inicio: tripData.startDate, fin: tripData.endDate }}
                                          onAddActivity={onAddOrUpdateActivity}
                                          tripId={tripId}
                                      />
                                    </div>
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
