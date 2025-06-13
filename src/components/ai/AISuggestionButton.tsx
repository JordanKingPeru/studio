
"use client";

import { useState, useEffect } from 'react';
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
import { Sparkles, BrainCircuit, Lightbulb, Loader2, CalendarIcon, ClockIcon } from 'lucide-react';
import { recommendActivity, type RecommendActivityInput, type RecommendActivityOutput } from '@/ai/flows/recommend-activity';
import type { City, Activity, ActivityCategory } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format, parseISO } from 'date-fns';
import { Label } from '@/components/ui/label';


const suggestionSchema = z.object({
  city: z.string().min(1, "Selecciona una ciudad."),
  interests: z.string().optional(),
  tripDetails: z.string().min(1, "Los detalles del viaje son necesarios."),
});

type SuggestionFormData = z.infer<typeof suggestionSchema>;

interface AISuggestionButtonProps {
  cities: City[];
  tripFamilia: string;
  tripDates: { inicio: string; fin: string };
  onAddActivity: (activity: Activity) => Promise<void>;
}

export default function AISuggestionButton({ cities, tripFamilia, tripDates, onAddActivity }: AISuggestionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<RecommendActivityOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [suggestedDate, setSuggestedDate] = useState('');
  const [suggestedTime, setSuggestedTime] = useState('12:00');

  const defaultTripDetailsGlobal = `Viaje para ${tripFamilia} desde ${format(parseISO(tripDates.inicio), "dd/MM/yyyy")} hasta ${format(parseISO(tripDates.fin), "dd/MM/yyyy")}.`;

  const form = useForm<SuggestionFormData>({
    resolver: zodResolver(suggestionSchema),
    defaultValues: {
      city: cities[0]?.name || '',
      interests: '',
      tripDetails: defaultTripDetailsGlobal,
    },
  });
  
  useEffect(() => {
    if (isOpen) {
        const initialCityName = cities[0]?.name || '';
        const initialCityData = cities.find(c => c.name === initialCityName);
        
        let currentTripDetailsText = defaultTripDetailsGlobal;
        if (initialCityData) {
            currentTripDetailsText = `Viaje para ${tripFamilia} a ${initialCityData.name} (llegada: ${format(parseISO(initialCityData.arrivalDate), "dd/MM/yyyy")}, salida: ${format(parseISO(initialCityData.departureDate), "dd/MM/yyyy")}).`;
        }

        form.reset({
            city: initialCityName,
            interests: '',
            tripDetails: currentTripDetailsText,
        });
        setSuggestion(null);
        setError(null);
        
        const cityForDate = initialCityData || (cities[0] ? cities[0] : undefined);
        const initialDateForOutput = cityForDate?.arrivalDate || tripDates.inicio;
        setSuggestedDate(initialDateForOutput);
        setSuggestedTime("12:00");
    }
  }, [isOpen, cities, tripDates.inicio, tripDates.fin, form, tripFamilia, defaultTripDetailsGlobal]);

  const handleGenerateSuggestion: SubmitHandler<SuggestionFormData> = async (data) => {
    setIsLoading(true);
    setError(null);
    setSuggestion(null);
    try {
      const result = await recommendActivity(data);
      setSuggestion(result);

      const selectedCityInForm = form.getValues('city');
      const selectedCityObject = cities.find(c => c.name === selectedCityInForm);
      let initialDateForSuggestionOutput = selectedCityObject?.arrivalDate || tripDates.inicio;
      
      setSuggestedDate(initialDateForSuggestionOutput);
      setSuggestedTime(result.suggestedTime || '12:00');

    } catch (err) {
      console.error("Error generating suggestion:", err);
      setError("No se pudo generar la sugerencia. Inténtalo de nuevo.");
      toast({
        variant: "destructive",
        title: "Error de IA",
        description: "Hubo un problema al contactar el servicio de IA.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSuggestedActivity = async () => {
    if (suggestion && form.getValues("city") && suggestedDate && suggestedTime) {
      const selectedCityName = form.getValues("city");
      
      const newActivity: Activity = {
        id: `ai-${Date.now()}`,
        date: suggestedDate, 
        time: suggestedTime,
        title: suggestion.activity,
        category: 'Ocio' as ActivityCategory, 
        notes: suggestion.reason,
        city: selectedCityName,
        order: Date.now(), 
        attachments: [],
      };

      try {
        await onAddActivity(newActivity);
        toast({
          title: "Actividad Añadida",
          description: `"${suggestion.activity}" ha sido añadida al itinerario.`,
        });
      } catch (err) {
        console.error("Error adding AI suggested activity:", err);
        toast({
          variant: "destructive",
          title: "Error al Añadir",
          description: `No se pudo añadir la actividad sugerida. Error: ${(err as Error).message}`,
        });
      } finally {
        setSuggestion(null); 
        setIsOpen(false);    
      }

    } else {
        toast({
            variant: "destructive",
            title: "Faltan Datos",
            description: "Por favor, asegúrate de que la fecha y la hora estén seleccionadas.",
        });
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-accent hover:bg-accent/90 text-accent-foreground border-accent-foreground/20">
          <Sparkles className="mr-2 h-5 w-5" />
          Recomendar Actividad (IA)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg rounded-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-primary flex items-center">
            <BrainCircuit className="mr-2" />
            Sugerencia de Actividad con IA
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleGenerateSuggestion)} className="space-y-6 py-2">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciudad</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value); // Update RHF city field
                      const selectedCityObject = cities.find(c => c.name === value);
                      setSuggestedDate(selectedCityObject?.arrivalDate || tripDates.inicio); // Update output date picker
                      
                      // Dynamically update tripDetails in the form
                      if (selectedCityObject) {
                        const citySpecificTripDetails = `Viaje para ${tripFamilia} a ${selectedCityObject.name} (llegada: ${format(parseISO(selectedCityObject.arrivalDate), "dd/MM/yyyy")}, salida: ${format(parseISO(selectedCityObject.departureDate), "dd/MM/yyyy")}).`;
                        form.setValue('tripDetails', citySpecificTripDetails, { shouldValidate: true, shouldDirty: true });
                      } else {
                        form.setValue('tripDetails', defaultTripDetailsGlobal, { shouldValidate: true, shouldDirty: true });
                      }
                    }} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una ciudad" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {cities.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="interests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Intereses (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: arte, historia, parques naturales" {...field} />
                  </FormControl>
                  <FormDescription>Ayuda a la IA a encontrar mejores actividades.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tripDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detalles del Viaje</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormDescription>Contexto para la IA. Se actualiza al cambiar de ciudad.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
              {isLoading ? 'Generando...' : 'Obtener Sugerencia'}
            </Button>
          </form>
        </Form>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {suggestion && !isLoading && (
          <div className="mt-6 p-4 border rounded-lg bg-muted/50 space-y-4">
            <div>
              <h3 className="text-lg font-semibold font-headline text-primary">{suggestion.activity}</h3>
              <p className="text-sm text-foreground/80">{suggestion.reason}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <Label htmlFor="suggestedDateAI" className="flex items-center text-sm font-medium"><CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />Fecha</Label>
                    <Input 
                        id="suggestedDateAI"
                        type="date" 
                        value={suggestedDate} 
                        onChange={(e) => setSuggestedDate(e.target.value)}
                        min={tripDates.inicio}
                        max={tripDates.fin}
                        className="text-sm"
                    />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="suggestedTimeAI" className="flex items-center text-sm font-medium"><ClockIcon className="mr-2 h-4 w-4 text-muted-foreground" />Hora</Label>
                    <Input 
                        id="suggestedTimeAI"
                        type="time" 
                        value={suggestedTime} 
                        onChange={(e) => setSuggestedTime(e.target.value)} 
                        className="text-sm"
                    />
                </div>
            </div>

            <Button onClick={handleAddSuggestedActivity} className="w-full" variant="default" disabled={isLoading}>
              Añadir al Itinerario
            </Button>
          </div>
        )}
        
        <DialogFooter className="mt-4">
            <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => { 
                    setIsOpen(false); 
                }}>Cerrar</Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

