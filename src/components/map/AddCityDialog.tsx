
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Globe, MapPin as MapPinIcon, CalendarIcon, StickyNote, Search, Loader2 } from 'lucide-react';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { useToast } from "@/hooks/use-toast";
import type { City, Coordinates } from '@/lib/types';

const cityFormSchema = z.object({
  name: z.string().min(1, "El nombre de la ciudad es obligatorio."),
  country: z.string().min(1, "El país es obligatorio."),
  arrivalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  notes: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export type CityFormData = z.infer<typeof cityFormSchema>;

interface AddCityDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddCity: (cityData: Omit<City, 'id' | 'coordinates'> & { coordinates: Coordinates }) => Promise<void>;
  googleMapsApiKey: string | undefined;
  isGoogleMapsApiLoaded: boolean;
  googleMapsApiLoadError: Error | undefined;
}

const mapContainerStyle = {
  width: '100%',
  height: '200px',
  borderRadius: '0.375rem', // md
};

const defaultMapCenter = { lat: 40.416775, lng: -3.703790 }; // Madrid for initial map display if needed

export default function AddCityDialog({
  isOpen,
  onOpenChange,
  onAddCity,
  googleMapsApiKey,
  isGoogleMapsApiLoaded,
  googleMapsApiLoadError,
}: AddCityDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forceRenderKey, setForceRenderKey] = useState(0); // To help re-render readOnly fields
  const [previewCenter, setPreviewCenter] = useState<Coordinates | null>(null);

  const citySearchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const placeChangedListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  const form = useForm<CityFormData>({
    resolver: zodResolver(cityFormSchema),
    defaultValues: {
      name: '',
      country: '',
      arrivalDate: new Date().toISOString().split('T')[0],
      departureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default to one week later
      notes: '',
      lat: undefined,
      lng: undefined,
    },
  });

  // Effect to initialize or clean up Google Maps Autocomplete
  useEffect(() => {
    if (isOpen && isGoogleMapsApiLoaded && !googleMapsApiLoadError && citySearchInputRef.current) {
      if (!autocompleteRef.current) { // Initialize only if not already initialized
        console.log("AddCityDialog DEBUG: Initializing Google Maps Autocomplete on input:", citySearchInputRef.current);
        const newAutocomplete = new window.google.maps.places.Autocomplete(
          citySearchInputRef.current,
          {
            types: ['(cities)'],
            fields: ['address_components', 'geometry.location', 'name', 'formatted_address', 'place_id'],
          }
        );
        autocompleteRef.current = newAutocomplete;
        console.log("AddCityDialog DEBUG: Google Maps JS Autocomplete initialized.");

        // Attach the place_changed listener
        if (placeChangedListenerRef.current) {
          google.maps.event.removeListener(placeChangedListenerRef.current); // Remove old listener if any
        }
        placeChangedListenerRef.current = newAutocomplete.addListener('place_changed', handlePlaceSelected);
        console.log("AddCityDialog DEBUG: ADDED 'place_changed' listener.");

      }
    } else if (!isOpen && autocompleteRef.current) {
      // Cleanup when dialog is closed
      console.log("AddCityDialog DEBUG: Dialog closed. Cleaning up Autocomplete instance.");
      if (placeChangedListenerRef.current) {
        google.maps.event.removeListener(placeChangedListenerRef.current);
        placeChangedListenerRef.current = null;
        console.log("AddCityDialog DEBUG: Removed 'place_changed' listener.");
      }
      // Removing PAC containers is good practice on dialog close
      document.querySelectorAll('.pac-container').forEach(elem => elem.remove());
      autocompleteRef.current = null; // Allow re-initialization if dialog reopens
    }

    // General cleanup on component unmount or if critical dependencies change
    return () => {
      if (placeChangedListenerRef.current) {
        google.maps.event.removeListener(placeChangedListenerRef.current);
        placeChangedListenerRef.current = null;
        console.log("AddCityDialog DEBUG: useEffect cleanup - Removed 'place_changed' listener during unmount/dep change.");
      }
      if (autocompleteRef.current && !isOpen) { // If component unmounts while dialog was closed
          autocompleteRef.current = null;
      }
    };
  }, [isOpen, isGoogleMapsApiLoaded, googleMapsApiLoadError, citySearchInputRef]);


  const handleDialogChange = useCallback((open: boolean) => {
    onOpenChange(open);
    if (open) {
      console.log("AddCityDialog DEBUG: Dialog opening via handleDialogChange. Resetting form.");
      form.reset({
        name: '',
        country: '',
        arrivalDate: new Date().toISOString().split('T')[0],
        departureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: '',
        lat: undefined,
        lng: undefined,
      });
      setPreviewCenter(null);
      if (citySearchInputRef.current) {
        citySearchInputRef.current.value = '';
      }
      setForceRenderKey(prev => prev + 1);
    } else {
      // Autocomplete instance cleanup is handled by the main useEffect now.
      // Just ensure PAC containers are removed if any linger.
      document.querySelectorAll('.pac-container').forEach(elem => elem.remove());
    }
  }, [onOpenChange, form]);


  const handlePlaceSelected = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place) {
        console.log("AddCityDialog DEBUG: Google JS API place_changed event. Place data:", place);
        
        let cityName = place.name || '';
        let countryName = '';
        const lat = place.geometry?.location?.lat();
        const lng = place.geometry?.location?.lng();

        if (place.address_components) {
          const countryComponent = place.address_components.find(component => component.types.includes('country'));
          countryName = countryComponent ? countryComponent.long_name : '';
        }

        console.log(`AddCityDialog DEBUG: Extracted Values - Name: "${cityName}", Country: "${countryName}", Lat: ${lat}, Lng: ${lng}`);

        if (cityName && countryName && typeof lat === 'number' && typeof lng === 'number') {
          form.setValue('name', cityName, { shouldValidate: true, shouldDirty: true });
          form.setValue('country', countryName, { shouldValidate: true, shouldDirty: true });
          form.setValue('lat', lat, { shouldValidate: true, shouldDirty: true });
          form.setValue('lng', lng, { shouldValidate: true, shouldDirty: true });
          setPreviewCenter({ lat, lng });
          toast({ title: "Ciudad Seleccionada", description: `${cityName}, ${countryName} autocompletada.` });
        } else {
          toast({ variant: "destructive", title: "Datos Incompletos", description: "No se pudo obtener toda la información de la ciudad. Inténtalo de nuevo." });
          console.warn("AddCityDialog DEBUG: Missing essential place data after selection:", { cityName, countryName, lat, lng });
          form.setValue('name', '', { shouldValidate: true });
          form.setValue('country', '', { shouldValidate: true });
          form.setValue('lat', undefined, { shouldValidate: true });
          form.setValue('lng', undefined, { shouldValidate: true });
          setPreviewCenter(null);
        }
        setForceRenderKey(prev => prev + 1);
      } else {
        console.log("AddCityDialog DEBUG: place_changed event fired, but no place data retrieved.");
      }
    }
  }, [form, toast]);


  const handleFormSubmit = async (data: CityFormData) => {
    console.log("AddCityDialog DEBUG: handleFormSubmit - Attempting to submit form with data:", data);
    setIsSubmitting(true);
    if (typeof data.lat !== 'number' || typeof data.lng !== 'number') {
      toast({
        variant: "destructive",
        title: "Error de Coordenadas",
        description: "Las coordenadas de la ciudad no se pudieron obtener. Por favor, selecciona la ciudad nuevamente desde el buscador.",
      });
      console.error("AddCityDialog DEBUG: Form submission aborted, missing coordinates.", data);
      setIsSubmitting(false);
      return;
    }

    try {
      await onAddCity({
        name: data.name,
        country: data.country,
        arrivalDate: data.arrivalDate,
        departureDate: data.departureDate,
        notes: data.notes,
        coordinates: { lat: data.lat, lng: data.lng },
      });
      toast({ title: "Ciudad Añadida", description: `${data.name} ha sido añadida al itinerario.` });
      handleDialogChange(false); // Close dialog and trigger reset logic
    } catch (error) {
      console.error("AddCityDialog DEBUG: Error submitting city:", error);
      toast({ variant: "destructive", title: "Error al Guardar", description: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      {/* DialogTrigger is handled by MapSection, which passes isOpen and onOpenChange */}
      <DialogContent className="sm:max-w-lg rounded-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-primary flex items-center">
            <MapPinIcon size={22} className="mr-2" />
            Añadir Nueva Ciudad
          </DialogTitle>
          <DialogDescription>
            Busca y selecciona una ciudad para autocompletar los datos. Luego, completa las fechas de tu estancia.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
            <div className="space-y-1">
              <FormLabel htmlFor="city-search-input" className="flex items-center"><Search className="mr-2 h-4 w-4 text-muted-foreground" />Buscar Ciudad</FormLabel>
              <Input
                id="city-search-input"
                ref={citySearchInputRef}
                placeholder="Ej: París, Francia"
                disabled={!isGoogleMapsApiLoaded || !!googleMapsApiLoadError}
                className="text-base"
              />
              {!isGoogleMapsApiLoaded && !googleMapsApiLoadError && <p className="text-xs text-muted-foreground flex items-center pt-1"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Cargando API de Google Maps...</p>}
              {googleMapsApiLoadError && <p className="text-xs text-destructive">Error al cargar Google Maps: {googleMapsApiLoadError.message}</p>}
            </div>

            <FormField
              key={`city-name-${forceRenderKey}`}
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><MapPinIcon className="mr-2 h-4 w-4 text-muted-foreground" />Nombre Ciudad</FormLabel>
                  <FormControl>
                    <Input placeholder="Se autocompletará" {...field} value={field.value || ''} readOnly className="bg-muted/50"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              key={`country-name-${forceRenderKey}`}
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Globe className="mr-2 h-4 w-4 text-muted-foreground" />País</FormLabel>
                  <FormControl>
                    <Input placeholder="Se autocompletará" {...field} value={field.value || ''} readOnly className="bg-muted/50"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField control={form.control} name="lat" render={({ field }) => <FormItem className="hidden"><FormControl><Input type="hidden" {...field} /></FormControl></FormItem>} />
            <FormField control={form.control} name="lng" render={({ field }) => <FormItem className="hidden"><FormControl><Input type="hidden" {...field} /></FormControl></FormItem>} />

            {previewCenter && isGoogleMapsApiLoaded && googleMapsApiKey && !googleMapsApiLoadError && (
              <div className="mt-4">
                <FormLabel>Vista Previa del Mapa</FormLabel>
                <div className="mt-1 h-[200px] w-full rounded-md overflow-hidden border">
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={previewCenter}
                    zoom={10}
                    options={{
                      streetViewControl: false,
                      mapTypeControl: false,
                      fullscreenControl: false,
                      zoomControl: true,
                      clickableIcons: false,
                    }}
                  >
                    <MarkerF position={previewCenter} />
                  </GoogleMap>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="arrivalDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />Llegada</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="text-base"/>
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
                    <FormLabel className="flex items-center"><CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />Salida</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="text-base"/>
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
                  <FormLabel className="flex items-center"><StickyNote className="mr-2 h-4 w-4 text-muted-foreground" />Notas</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Información adicional sobre esta ciudad..." {...field} className="text-base"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => handleDialogChange(false)}>Cancelar</Button>
              <Button 
                type="submit" 
                disabled={
                  isSubmitting || 
                  !isGoogleMapsApiLoaded || 
                  !!googleMapsApiLoadError || 
                  (form.formState.isSubmitted && !form.formState.isValid)
                }
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Añadir Ciudad
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    