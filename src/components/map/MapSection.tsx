
"use client";
import type { TripDetails, City, Coordinates } from '@/lib/types';
import SectionCard from '@/components/ui/SectionCard';
import { MapPin, Route, PlusCircle, Trash2, CalendarIcon, Globe, StickyNote } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

interface MapSectionProps {
  tripData: TripDetails; // For overall trip context if needed, like start/end dates
  cities: City[]; // The dynamic list of cities from Firestore
  onAddCity: (cityData: Omit<City, 'id' | 'coordinates'> & { coordinates?: Partial<Coordinates> }) => Promise<void>;
  onDeleteCity: (cityId: string) => Promise<void>;
}

const cityFormSchema = z.object({
  name: z.string().min(1, "El nombre de la ciudad es obligatorio."),
  country: z.string().min(1, "El país es obligatorio."),
  arrivalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  notes: z.string().optional(),
});

type CityFormData = z.infer<typeof cityFormSchema>;

export default function MapSection({ tripData, cities, onAddCity, onDeleteCity }: MapSectionProps) {
  const form = useForm<CityFormData>({
    resolver: zodResolver(cityFormSchema),
    defaultValues: {
      name: '',
      country: '',
      arrivalDate: new Date().toISOString().split('T')[0],
      departureDate: new Date().toISOString().split('T')[0],
      notes: '',
    },
  });

  const handleAddCitySubmit = async (data: CityFormData) => {
    await onAddCity({
      ...data,
      coordinates: { lat: 0, lng: 0 }, // Default coordinates for now
    });
    form.reset(); // Reset form after submission
  };

  return (
    <SectionCard
      id="map"
      title="Mapa de Viaje"
      icon={<Route size={32} />}
      description="Gestiona y visualiza las ciudades de tu itinerario."
    >
      <div className="space-y-8">
        {/* Form to add a new city */}
        <Card className="rounded-xl shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary flex items-center">
              <PlusCircle size={22} className="mr-2" />
              Añadir Nueva Ciudad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAddCitySubmit)} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-muted-foreground" />Nombre Ciudad</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: París" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center"><Globe className="mr-2 h-4 w-4 text-muted-foreground" />País</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Francia" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="arrivalDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center"><CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />Fecha Llegada</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="departureDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center"><CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />Fecha Salida</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center"><StickyNote className="mr-2 h-4 w-4 text-muted-foreground" />Notas (opcional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Añade detalles sobre la ciudad..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Añadiendo...' : 'Añadir Ciudad al Viaje'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* List of planned cities */}
        <div className="p-2 sm:p-0">
          <h3 className="text-xl font-headline text-secondary-foreground mb-4">Ciudades Planificadas</h3>
          {cities.length > 0 ? (
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cities.map((city: City) => (
                <li key={city.id} className="p-4 bg-card rounded-lg shadow-md hover:shadow-lg transition-shadow relative group">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-7 w-7 text-muted-foreground hover:text-destructive opacity-50 group-hover:opacity-100 transition-opacity"
                    onClick={() => onDeleteCity(city.id)}
                    aria-label={`Eliminar ${city.name}`}
                  >
                    <Trash2 size={16} />
                  </Button>
                  <p className="font-semibold text-lg text-primary pr-8">{city.name}, <span className="font-normal text-base text-muted-foreground">{city.country}</span></p>
                  <p className="text-sm text-foreground/80">
                    {format(parseISO(city.arrivalDate), "d MMM", { locale: es })} - {format(parseISO(city.departureDate), "d MMM yyyy", { locale: es })}
                  </p>
                  {city.notes && <p className="text-xs text-accent-foreground/70 mt-1 italic">{city.notes}</p>}
                   {/* You can display coordinates or budget if needed:
                   <p className="text-xs text-muted-foreground mt-1">Coords: {city.coordinates.lat.toFixed(2)}, {city.coordinates.lng.toFixed(2)}</p>
                   {typeof city.budget === 'number' && <p className="text-xs text-muted-foreground mt-1">Presupuesto: {city.budget.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>}
                   */}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-center py-4">No hay ciudades planificadas. ¡Añade la primera!</p>
          )}
        </div>

        {/* Placeholder for interactive map */}
        <div className="text-center p-4 border-2 border-dashed border-border rounded-lg mt-8">
          <p className="text-muted-foreground">
            Mapa interactivo con Leaflet, pins y rutas próximamente.
          </p>
          <img data-ai-hint="world map" src="https://placehold.co/600x400.png" alt="Placeholder for an interactive map" className="mt-4 rounded-md mx-auto opacity-50" />
        </div>
      </div>
    </SectionCard>
  );
}
