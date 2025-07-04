
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { SubmitHandler } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Sparkles, BrainCircuit, Lightbulb, Loader2, Calendar as CalendarIcon, ClockIcon } from 'lucide-react';
import { recommendActivity, type RecommendActivityInput, type RecommendActivityOutput } from '@/ai/flows/recommend-activity';
import type { City, Activity, ActivityCategory } from '@/lib/types';
import { activityCategories } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format, parseISO, isWithinInterval, addHours } from 'date-fns';
import { es } from 'date-fns/locale';
import { Label } from '@/components/ui/label';

const suggestionSchema = z.object({
  city: z.string().min(1, "Selecciona una ciudad."),
  category: z.string().optional(),
  interests: z.string().optional(),
  tripDetails: z.string().min(1, "Los detalles del viaje son necesarios."),
});

type SuggestionFormData = z.infer<typeof suggestionSchema>;

interface AISuggestionButtonProps {
  cities: City[];
  tripFamilia: string;
  tripDates: { inicio: string; fin: string };
  onAddActivity: (activity: Activity) => Promise<void>;
  tripId: string;
  forDate: string; // The specific date for the suggestion
  allActivities: Activity[];
}

export default function AISuggestionButton({ cities, tripFamilia, tripDates, onAddActivity, tripId, forDate, allActivities }: AISuggestionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<RecommendActivityOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [suggestedDate, setSuggestedDate] = useState('');
  const [suggestedTime, setSuggestedTime] = useState('10:00');
  
  const currentTripCities = useMemo(() => cities.filter(c => c.tripId === tripId), [cities, tripId]);
  
  const formId = useMemo(() => `ai-suggestion-form-${Math.random().toString(36).substring(2, 9)}`, []);

  const form = useForm<SuggestionFormData>({
    resolver: zodResolver(suggestionSchema),
    defaultValues: {
      city: '',
      category: '',
      interests: '',
      tripDetails: '',
    },
  });

  const formattedDateForTitle = useMemo(() => {
    if (!forDate) return '';
    const formatted = format(parseISO(forDate), "EEEE, d 'de' MMMM", { locale: es });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, [forDate]);
  
  useEffect(() => {
    if (isOpen) {
        const cityForDate = currentTripCities.find(c => {
            const arrival = parseISO(c.arrivalDate);
            const departure = parseISO(c.departureDate);
            return isWithinInterval(parseISO(forDate), { start: arrival, end: departure });
        }) || currentTripCities[0];

        const initialCityName = cityForDate?.name || '';
        const detailsText = `Viaje para ${tripFamilia} a ${initialCityName}.`;
        
        const activitiesForDate = allActivities.filter(act => act.date === forDate);
        let nextAvailableTime = '10:00';
        if (activitiesForDate.length > 0) {
            const sortedActivities = [...activitiesForDate].sort((a, b) => a.time.localeCompare(b.time));
            const lastActivityTime = sortedActivities[sortedActivities.length - 1].time;
            try {
                const [hours, minutes] = lastActivityTime.split(':').map(Number);
                const lastActivityDate = new Date();
                lastActivityDate.setHours(hours + 1, minutes);
                nextAvailableTime = format(lastActivityDate, 'HH:mm');
            } catch (e) {
                console.error("Error parsing last activity time, defaulting.", e);
            }
        }

        form.reset({
            city: initialCityName,
            category: '',
            interests: '',
            tripDetails: detailsText,
        });
        setSuggestion(null);
        setError(null);
        
        setSuggestedDate(forDate);
        setSuggestedTime(nextAvailableTime);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, forDate, currentTripCities, tripFamilia, form.reset, allActivities]);


  const handleGenerateSuggestion: SubmitHandler<SuggestionFormData> = async (data) => {
    setIsLoading(true);
    setError(null);
    setSuggestion(null);

    const existingActivitiesForDay = allActivities
        .filter(act => act.date === forDate)
        .map(act => act.title)
        .join(', ');

    try {
      const inputForAI: RecommendActivityInput = {
          ...data,
          existingActivities: existingActivitiesForDay,
      };
      const result = await recommendActivity(inputForAI); 
      setSuggestion(result);
      // The suggestedTime state is already calculated and set in the useEffect hook.
      // We will keep that value as the primary suggestion for the time input.
      // If the AI provides a time, it's in result.suggestedTime, but we prioritize the calculated one.

    } catch (err) {
      setError("No se pudo generar la sugerencia. Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSuggestedActivity = async () => {
    if (suggestion && form.getValues("city") && suggestedDate && suggestedTime && tripId) {
      const selectedCityName = form.getValues("city");
      
      const newActivity: Activity = {
        id: `ai-${Date.now()}`,
        tripId: tripId, 
        date: suggestedDate, 
        time: suggestedTime,
        title: suggestion.activity,
        category: (suggestion.category as ActivityCategory) || (form.getValues("category") as ActivityCategory) || ('Ocio' as ActivityCategory),
        notes: suggestion.reason,
        city: selectedCityName,
        order: Date.now(), 
        attachments: [],
      };
      try {
        await onAddActivity(newActivity);
        toast({ title: "Actividad Añadida", description: `"${suggestion.activity}" añadida.` });
      } catch (err) {
        toast({ variant: "destructive", title: "Error", description: `No se pudo añadir. ${(err as Error).message}` });
      } finally {
        setSuggestion(null); 
        setIsOpen(false);    
      }
    } else {
        toast({ variant: "destructive", title: "Faltan Datos", description: "Fecha y hora son necesarias." });
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground border-accent-foreground/20 w-full sm:w-auto">
          <Sparkles className="mr-2 h-4 w-4" />
          Recomendar con IA
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg rounded-xl shadow-2xl p-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="font-headline text-2xl text-primary flex items-center">
            <BrainCircuit className="mr-2" />Sugerencia de IA para {formattedDateForTitle}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <Form {...form}>
              <form id={formId} onSubmit={form.handleSubmit(handleGenerateSuggestion)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ciudad</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value); 
                          const citySpecificTripDetails = `Viaje para ${tripFamilia} a ${value}.`;
                          form.setValue('tripDetails', citySpecificTripDetails, { shouldValidate: true, shouldDirty: true });
                          setSuggestedDate(forDate);
                        }} 
                        value={field.value}
                      >
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecciona ciudad" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {currentTripCities.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                      <FormItem>
                          <FormLabel>Categoría (Opcional)</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(value === 'any' ? '' : value)} 
                            value={field.value || 'any'}
                          >
                              <FormControl><SelectTrigger><SelectValue placeholder="Cualquier categoría" /></SelectTrigger></FormControl>
                              <SelectContent>
                                  <SelectItem value="any">Cualquier categoría</SelectItem>
                                  {activityCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                              </SelectContent>
                          </Select>
                          <FormDescription>Filtra la sugerencia por una categoría específica.</FormDescription>
                          <FormMessage />
                      </FormItem>
                  )}
                />
                <FormField control={form.control} name="interests" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Intereses (opcional)</FormLabel>
                      <FormControl><Input placeholder="Ej: arte, parques" {...field} /></FormControl>
                      <FormDescription>Ayuda a la IA a encontrar mejores actividades.</FormDescription>
                      <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="tripDetails" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Detalles del Viaje</FormLabel>
                      <FormControl><Textarea rows={3} {...field} /></FormControl>
                      <FormDescription>Contexto para la IA.</FormDescription>
                      <FormMessage />
                    </FormItem>
                )} />
              </form>
            </Form>
            {error && (<Alert variant="destructive" className="mt-4"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>)}
            {suggestion && !isLoading && (
              <div className="mt-6 p-4 border rounded-lg bg-muted/50 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold font-headline text-primary">{suggestion.activity}</h3>
                  <p className="text-sm text-foreground/80">{suggestion.reason}</p>
                </div>
                
                <div className="space-y-1">
                    <Label htmlFor="suggestedTimeAI" className="flex items-center text-sm font-medium"><ClockIcon className="mr-2 h-4 w-4 text-muted-foreground" />Confirmar Hora</Label>
                    <Input id="suggestedTimeAI" type="time" value={suggestedTime} onChange={(e) => setSuggestedTime(e.target.value)} className="text-sm"/>
                </div>

                <Button onClick={handleAddSuggestedActivity} className="w-full" variant="default" disabled={isLoading}>Añadir al Itinerario</Button>
              </div>
            )}
        </div>
        
        <DialogFooter className="p-6 pt-4 border-t flex-shrink-0 bg-background">
            <DialogClose asChild><Button type="button" variant="outline">Cerrar</Button></DialogClose>
            <Button type="submit" form={formId} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                {isLoading ? 'Generando...' : 'Obtener Sugerencia'}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
