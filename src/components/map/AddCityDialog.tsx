
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
import { Globe, MapPin as MapPinIcon, CalendarIcon, StickyNote, Search, Loader2, PlusCircle, Edit3 } from 'lucide-react'; // Added Edit3
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { useToast } from "@/hooks/use-toast";
import type { City, Coordinates } from '@/lib/types';

const cityFormSchema = z.object({
  id: z.string().optional(), // For editing
  name: z.string().min(1, "El nombre de la ciudad es obligatorio."),
  country: z.string().min(1, "El país es obligatorio."),
  arrivalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  notes: z.string().optional(),
  lat: z.number({ required_error: "La latitud es necesaria. Selecciona la ciudad usando el buscador." }).min(-90).max(90),
  lng: z.number({ required_error: "La longitud es necesaria. Selecciona la ciudad usando el buscador." }).min(-180).max(180),
});

export type CityFormData = z.infer<typeof cityFormSchema>;

interface AddCityDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSaveCity: (cityData: CityFormData) => Promise<void>; // Renamed from onAddCity
  googleMapsApiKey: string | undefined;
  isGoogleMapsApiLoaded: boolean;
  googleMapsApiLoadError: Error | undefined;
  initialData?: City | null; // For editing
}

const mapContainerStyle = {
  width: '100%',
  height: '200px',
  borderRadius: '0.375rem', // md
};

const defaultNewCityValues: CityFormData = {
  name: '',
  country: '',
  arrivalDate: new Date().toISOString().split('T')[0],
  departureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  notes: '',
  lat: 0, // Placeholder, will be set by search
  lng: 0, // Placeholder, will be set by search
};

export default function AddCityDialog({
  isOpen,
  onOpenChange,
  onSaveCity,
  googleMapsApiKey,
  isGoogleMapsApiLoaded,
  googleMapsApiLoadError,
  initialData,
}: AddCityDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forceRenderKey, setForceRenderKey] = useState(0);
  const [previewCenter, setPreviewCenter] = useState<Coordinates | null>(null);

  const citySearchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteInstanceRef = useRef<google.maps.places.Autocomplete | null>(null);
  const placeChangedListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  const form = useForm<CityFormData>({
    resolver: zodResolver(cityFormSchema),
    defaultValues: initialData ? {
      id: initialData.id,
      name: initialData.name,
      country: initialData.country,
      arrivalDate: initialData.arrivalDate,
      departureDate: initialData.departureDate,
      notes: initialData.notes || '',
      lat: initialData.coordinates.lat,
      lng: initialData.coordinates.lng,
    } : defaultNewCityValues,
  });

  useEffect(() => {
    if (isOpen) {
      console.log("AddCityDialog: Dialog opened. InitialData:", initialData);
      if (initialData) {
        form.reset({
          id: initialData.id,
          name: initialData.name,
          country: initialData.country,
          arrivalDate: initialData.arrivalDate,
          departureDate: initialData.departureDate,
          notes: initialData.notes || '',
          lat: initialData.coordinates.lat,
          lng: initialData.coordinates.lng,
        });
        if (initialData.coordinates.lat !== 0 || initialData.coordinates.lng !== 0) {
          setPreviewCenter(initialData.coordinates);
        } else {
           setPreviewCenter(null);
        }
      } else {
        form.reset(defaultNewCityValues);
        setPreviewCenter(null);
      }
      if (citySearchInputRef.current) {
        citySearchInputRef.current.value = initialData ? `${initialData.name}, ${initialData.country}` : '';
      }
      setForceRenderKey(prev => prev + 1); // Force re-render of form fields

      // Initialize Autocomplete
      if (isGoogleMapsApiLoaded && !googleMapsApiLoadError && citySearchInputRef.current && !autocompleteInstanceRef.current) {
        console.log("AddCityDialog: Initializing Google Maps Autocomplete on input:", citySearchInputRef.current);
        const autocomplete = new window.google.maps.places.Autocomplete(
          citySearchInputRef.current,
          {
            types: ['(cities)'], // Suggests cities
            fields: ['address_components', 'geometry.location', 'name', 'formatted_address', 'place_id'],
          }
        );
        autocompleteInstanceRef.current = autocomplete;
        console.log("AddCityDialog: Google Maps JS Autocomplete initialized.");

        if (placeChangedListenerRef.current) { // Remove old listener if any
          google.maps.event.removeListener(placeChangedListenerRef.current);
        }
        placeChangedListenerRef.current = autocomplete.addListener('place_changed', handlePlaceSelected);
        console.log("AddCityDialog: ADDED 'place_changed' listener.");
      }
    } else {
      // Cleanup Autocomplete when dialog is closed
      if (placeChangedListenerRef.current) {
        google.maps.event.removeListener(placeChangedListenerRef.current);
        placeChangedListenerRef.current = null;
        console.log("AddCityDialog: Dialog closed. Removed 'place_changed' listener.");
      }
      // Detaching the Autocomplete instance from the input and removing PAC containers
      if (autocompleteInstanceRef.current) {
        // google.maps.event.clearInstanceListeners(autocompleteInstanceRef.current); // More thorough cleanup
        autocompleteInstanceRef.current = null; // Allow re-initialization if dialog reopens
        console.log("AddCityDialog: Dialog closed. Cleared Autocomplete instance.");
      }
      document.querySelectorAll('.pac-container').forEach(elem => elem.remove());
    }

    // General cleanup on component unmount
    return () => {
      if (placeChangedListenerRef.current) {
        google.maps.event.removeListener(placeChangedListenerRef.current);
      }
      if (autocompleteInstanceRef.current) {
        // google.maps.event.clearInstanceListeners(autocompleteInstanceRef.current);
        autocompleteInstanceRef.current = null;
      }
      document.querySelectorAll('.pac-container').forEach(elem => elem.remove());
    };
  }, [isOpen, isGoogleMapsApiLoaded, googleMapsApiLoadError, form, initialData]);


  const handlePlaceSelected = useCallback(() => {
    if (autocompleteInstanceRef.current) {
      const place = autocompleteInstanceRef.current.getPlace();
      if (place) {
        console.log("AddCityDialog: Google JS API place_changed event. Place data:", place);
        
        let cityName = place.name || '';
        let countryName = '';
        const lat = place.geometry?.location?.lat();
        const lng = place.geometry?.location?.lng();

        if (place.address_components) {
          const countryComponent = place.address_components.find(component => component.types.includes('country'));
          countryName = countryComponent ? countryComponent.long_name : '';
          if (!cityName) { // Sometimes city name might be in address_components as 'locality'
             const cityComponent = place.address_components.find(component => component.types.includes('locality'));
             if (cityComponent) cityName = cityComponent.long_name;
          }
        }

        console.log(`AddCityDialog: Extracted Values - Name: "${cityName}", Country: "${countryName}", Coords: {lat: ${lat}, lng: ${lng}}`);

        if (cityName && countryName && typeof lat === 'number' && typeof lng === 'number') {
          form.setValue('name', cityName, { shouldValidate: true, shouldDirty: true });
          form.setValue('country', countryName, { shouldValidate: true, shouldDirty: true });
          form.setValue('lat', lat, { shouldValidate: true, shouldDirty: true });
          form.setValue('lng', lng, { shouldValidate: true, shouldDirty: true });
          setPreviewCenter({ lat, lng });
          toast({ title: "Ciudad Seleccionada", description: `${cityName}, ${countryName} autocompletada.` });
        } else {
          toast({ variant: "destructive", title: "Datos Incompletos", description: "No se pudo obtener toda la información de la ciudad. Inténtalo de nuevo." });
          console.warn("AddCityDialog: Missing essential place data after selection:", { cityName, countryName, lat, lng });
          form.setValue('name', initialData?.name || '', { shouldValidate: true });
          form.setValue('country', initialData?.country || '', { shouldValidate: true });
          form.setValue('lat', initialData?.coordinates.lat || 0, { shouldValidate: true });
          form.setValue('lng', initialData?.coordinates.lng || 0, { shouldValidate: true });
          setPreviewCenter(initialData?.coordinates || null);
        }
        setForceRenderKey(prev => prev + 1);
      } else {
        console.log("AddCityDialog: place_changed event fired, but no place data retrieved.");
      }
    }
  }, [form, toast, initialData]);


  const handleFormSubmit = async (data: CityFormData) => {
    console.log("AddCityDialog: handleFormSubmit - Attempting to submit form with data:", data);
    setIsSubmitting(true);
    
    // Ensure lat and lng are numbers (Zod schema should handle this, but an extra check)
    if (typeof data.lat !== 'number' || typeof data.lng !== 'number') {
      toast({
        variant: "destructive",
        title: "Error de Coordenadas",
        description: "Las coordenadas de la ciudad no se pudieron obtener. Por favor, selecciona la ciudad nuevamente desde el buscador.",
      });
      console.error("AddCityDialog: Form submission aborted, missing or invalid coordinates.", data);
      setIsSubmitting(false);
      return;
    }

    try {
      await onSaveCity(data); // Use the new prop name
      toast({ title: data.id ? "Ciudad Actualizada" : "Ciudad Añadida", description: `${data.name} ha sido guardada.` });
      onOpenChange(false); // Close dialog
    } catch (error) {
      console.error("AddCityDialog: Error submitting city:", error);
      toast({ variant: "destructive", title: "Error al Guardar", description: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const dialogTitle = initialData ? "Editar Ciudad" : "Añadir Nueva Ciudad";
  const submitButtonText = initialData ? "Guardar Cambios" : "Añadir Ciudad";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/* DialogTrigger is handled by MapSection */}
      <DialogContent className="sm:max-w-lg rounded-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-primary flex items-center">
            {initialData ? <Edit3 size={22} className="mr-2" /> : <PlusCircle size={22} className="mr-2" />}
            {dialogTitle}
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
            
            <FormField
              control={form.control}
              name="lat"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl><Input type="hidden" {...field} value={field.value || 0} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lng"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl><Input type="hidden" {...field} value={field.value || 0} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />


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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
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
                {submitButtonText}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
