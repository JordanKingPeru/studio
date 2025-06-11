
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input as ShadcnInput } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Globe, MapPin as MapPinIconLucide, CalendarIcon, StickyNote, Search, Loader2, PlusCircle, Edit3, AlertTriangle } from 'lucide-react';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { useToast } from "@/hooks/use-toast";
import { usePlaceAutocomplete } from '@/hooks/usePlaceAutocomplete';
import type { City, Coordinates } from '@/lib/types';

const cityFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "El nombre de la ciudad es obligatorio."),
  country: z.string().min(1, "El país es obligatorio."),
  arrivalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  notes: z.string().optional(),
  lat: z.number({ required_error: "La latitud es necesaria. Selecciona una ciudad del buscador." }).min(-90).max(90),
  lng: z.number({ required_error: "La longitud es necesaria. Selecciona una ciudad del buscador." }).min(-180).max(180),
});

export type CityFormData = z.infer<typeof cityFormSchema>;

interface AddCityDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSaveCity: (cityData: CityFormData) => Promise<void>;
  isLoaded: boolean;
  initialData?: City | null;
}

const mapContainerStyle = { width: '100%', height: '200px', borderRadius: '0.375rem' };
const defaultNewCityValues: Omit<CityFormData, 'id'> = {
  name: '', country: '',
  arrivalDate: new Date().toISOString().split('T')[0],
  departureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  notes: '', lat: 0, lng: 0,
};

export default function AddCityDialog({ isOpen, onOpenChange, onSaveCity, isLoaded, initialData }: AddCityDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewCenter, setPreviewCenter] = useState<Coordinates | null>(null);
  const [forceRenderMapKey, setForceRenderMapKey] = useState(0);

  const form = useForm<CityFormData>({
    resolver: zodResolver(cityFormSchema),
    defaultValues: defaultNewCityValues,
  });

  const {
    placeAutocompleteElementRef,
    extractedPlace,
    autocompleteError,
    clearAutocomplete
  } = usePlaceAutocomplete({ isLoaded });

  useEffect(() => {
    if (extractedPlace) {
      form.setValue('name', extractedPlace.name, { shouldValidate: true, shouldDirty: true });
      form.setValue('country', extractedPlace.country, { shouldValidate: true, shouldDirty: true });
      form.setValue('lat', extractedPlace.lat, { shouldValidate: true, shouldDirty: true });
      form.setValue('lng', extractedPlace.lng, { shouldValidate: true, shouldDirty: true });
      setPreviewCenter({ lat: extractedPlace.lat, lng: extractedPlace.lng });
      setForceRenderMapKey(prev => prev + 1);

      if (!extractedPlace.countryFound) {
          toast({
              variant: "default",
              title: "País no detectado",
              description: "No se pudo detectar el país automáticamente. Por favor, añádelo manualmente si es necesario.",
          });
          form.setFocus('country');
      }
    }
  }, [extractedPlace, form, toast]);

  const handleDialogStateChange = (openState: boolean) => {
    if (!openState) {
      console.log("AddCityDialog: Dialog is closing. Clearing form, preview, and search value.");
      clearAutocomplete();
      form.reset(defaultNewCityValues);
      setPreviewCenter(null);
    } else {
        const resetValues = initialData
            ? { ...initialData, notes: initialData.notes || '', lat: initialData.coordinates.lat, lng: initialData.coordinates.lng, id: initialData.id }
            : { ...defaultNewCityValues, id: undefined };
        
        console.log("AddCityDialog: [useEffect isOpen=true] - Resetting form with:", resetValues);
        form.reset(resetValues);
        setPreviewCenter(initialData ? initialData.coordinates : null);
        setForceRenderMapKey(prev => prev + 1);
    }
    onOpenChange(openState);
  };

  useEffect(() => {
    if (isOpen && initialData && placeAutocompleteElementRef.current) {
        placeAutocompleteElementRef.current.value = `${initialData.name}, ${initialData.country}`;
    }
  }, [isOpen, initialData, placeAutocompleteElementRef]);

  const handleFormSubmit = async (data: CityFormData) => {
    setIsSubmitting(true);
    if ((data.lat === 0 && data.lng === 0) && !initialData) {
      toast({ variant: "destructive", title: "Coordenadas Inválidas", description: "Selecciona una ciudad del buscador para obtener coordenadas válidas." });
      form.setError("name", { type: "manual", message: "Selecciona una ciudad válida del buscador." });
      setIsSubmitting(false);
      return;
    }
    try {
      await onSaveCity(data);
      handleDialogStateChange(false); // Close dialog
    } catch (error) {
      console.error("AddCityDialog: Error saving city:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestOptions = useMemo(() => JSON.stringify({
    fields: ["addressComponents", "geometry.location", "name", "formattedAddress", "displayName", "types"],
    includedPrimaryTypes: ["locality", "administrative_area_level_1", "postal_town", "sublocality_level_1"],
  }), []);

  const dialogTitle = initialData ? "Editar Ciudad" : "Añadir Nueva Ciudad";
  const dialogDescription = "Busca una ciudad para autocompletar los datos y completa las fechas de tu estancia.";
  const submitButtonText = initialData ? "Guardar Cambios" : "Añadir Ciudad";
  const FormIcon = initialData ? Edit3 : PlusCircle;

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogStateChange}>
      <DialogContent className="sm:max-w-lg rounded-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-primary flex items-center">
            <FormIcon size={22} className="mr-2" />
            {dialogTitle}
          </DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {!isLoaded ? (
              <div className="text-sm text-muted-foreground flex items-center p-3 border rounded-md bg-muted/50">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />Cargando API de Google Maps...
              </div>
            ) : (
              <div className="space-y-1">
                <Label htmlFor="gmp-city-search" className="flex items-center text-sm font-medium">
                  <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                  Buscar Ciudad
                </Label>
                <gmp-place-autocomplete-element
                  ref={placeAutocompleteElementRef}
                  id="gmp-city-search"
                  placeholder="Ej: París, Francia"
                  request-options={requestOptions}
                  className="w-full block border border-input bg-background rounded-md shadow-sm px-3 py-2 text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {autocompleteError && <FormMessage>{autocompleteError}</FormMessage>}
              </div>
            )}

            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                    <FormLabel className="flex items-center"><MapPinIconLucide className="mr-2 h-4 w-4 text-muted-foreground" />Nombre Ciudad</FormLabel>
                    <FormControl><ShadcnInput placeholder="Se autocompletará al buscar" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
            <FormField control={form.control} name="country" render={({ field }) => (
                <FormItem>
                    <FormLabel className="flex items-center"><Globe className="mr-2 h-4 w-4 text-muted-foreground" />País</FormLabel>
                    <FormControl><ShadcnInput placeholder="Se autocompletará al buscar" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />

            <FormField control={form.control} name="lat" render={({ field }) => <ShadcnInput type="hidden" {...field} />} />
            <FormField control={form.control} name="lng" render={({ field }) => <ShadcnInput type="hidden" {...field} />} />

            {isLoaded && previewCenter && (
              <div className="mt-3">
                <Label className="text-sm font-medium">Vista Previa del Mapa</Label>
                <div className="mt-1 h-[200px] w-full rounded-md overflow-hidden border">
                  <GoogleMap
                    key={`preview-map-${forceRenderMapKey}`}
                    mapContainerStyle={mapContainerStyle}
                    center={previewCenter}
                    zoom={10}
                    options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false, zoomControl: true, clickableIcons: false }}
                  >
                    <MarkerF position={previewCenter} />
                  </GoogleMap>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <FormField control={form.control} name="arrivalDate" render={({ field }) => (
                  <FormItem>
                      <FormLabel className="flex items-center"><CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />Llegada</FormLabel>
                      <FormControl><ShadcnInput type="date" {...field} className="text-sm" /></FormControl>
                      <FormMessage />
                  </FormItem>
              )} />
              <FormField control={form.control} name="departureDate" render={({ field }) => (
                  <FormItem>
                      <FormLabel className="flex items-center"><CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />Salida</FormLabel>
                      <FormControl><ShadcnInput type="date" {...field} className="text-sm" /></FormControl>
                      <FormMessage />
                  </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                    <FormLabel className="flex items-center"><StickyNote className="mr-2 h-4 w-4 text-muted-foreground" />Notas (opcional)</FormLabel>
                    <FormControl><Textarea placeholder="Información adicional sobre esta ciudad..." {...field} className="text-sm" /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />

            <DialogFooter className="pt-4 sticky bottom-0 bg-background pb-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting || !isLoaded}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitButtonText}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
