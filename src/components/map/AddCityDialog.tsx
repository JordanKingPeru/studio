
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Globe, MapPin as MapPinIconLucide, CalendarIcon, StickyNote, Search, Loader2, PlusCircle, Edit3 } from 'lucide-react';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { useToast } from "@/hooks/use-toast";
import type { City, Coordinates } from '@/lib/types';

const cityFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "El nombre de la ciudad es obligatorio."),
  country: z.string().min(1, "El país es obligatorio."),
  arrivalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  notes: z.string().optional(),
  lat: z.number({ required_error: "La latitud es necesaria." }).min(-90, "Latitud inválida").max(90, "Latitud inválida"),
  lng: z.number({ required_error: "La longitud es necesaria." }).min(-180, "Longitud inválida").max(180, "Longitud inválida"),
});

export type CityFormData = z.infer<typeof cityFormSchema>;

interface AddCityDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSaveCity: (cityData: CityFormData) => Promise<void>;
  googleMapsApiKey: string | undefined;
  isGoogleMapsApiLoaded: boolean;
  googleMapsApiLoadError: Error | undefined;
  initialData?: City | null;
}

const mapContainerStyle = {
  width: '100%',
  height: '200px',
  borderRadius: '0.375rem',
};

const defaultNewCityValues: Omit<CityFormData, 'id'> = {
  name: '',
  country: '',
  arrivalDate: new Date().toISOString().split('T')[0],
  departureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  notes: '',
  lat: 0,
  lng: 0,
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
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
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
    } : { ...defaultNewCityValues, id: undefined }
  });

  const handlePlaceSelected = useCallback(() => {
    if (!autocompleteRef.current) {
      console.error("AddCityDialog DEBUG: Autocomplete instance is null in handlePlaceSelected.");
      toast({ variant: "destructive", title: "Error de Autocompletado", description: "Instancia no disponible." });
      return;
    }
    console.log("AddCityDialog DEBUG: handlePlaceSelected CALLED.");
    const place = autocompleteRef.current.getPlace();
    console.log("AddCityDialog DEBUG: Raw Google PlaceResult:", JSON.stringify(place, null, 2));

    if (!place || !place.geometry || !place.geometry.location) {
      console.warn("AddCityDialog DEBUG: No place selected or place data is incomplete.");
      toast({ variant: "destructive", title: "Selección Inválida", description: "Datos del lugar incompletos. Intenta de nuevo o ingresa manualmente." });
      return;
    }

    let cityName = place.name || '';
    let countryName = '';
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    if (place.address_components) {
      const countryComponent = place.address_components.find(component => component.types.includes('country'));
      countryName = countryComponent ? countryComponent.long_name : '';
      
      if (!cityName) {
         const cityComponent = place.address_components.find(component => component.types.includes('locality') || component.types.includes('administrative_area_level_1'));
         if (cityComponent) cityName = cityComponent.long_name;
      }
    }
    
    if (!cityName && place.formatted_address) {
        cityName = place.formatted_address.split(',')[0];
    }

    console.log(`AddCityDialog DEBUG: Extracted Values - Name: "${cityName}", Country: "${countryName}", Lat: ${lat}, Lng: ${lng}`);

    if (cityName && typeof lat === 'number' && typeof lng === 'number') { // Country can be optional if not always found
      form.setValue('name', cityName, { shouldValidate: true, shouldDirty: true });
      form.setValue('country', countryName || 'País no encontrado', { shouldValidate: true, shouldDirty: true }); // Provide a fallback for country
      form.setValue('lat', lat, { shouldValidate: true, shouldDirty: true });
      form.setValue('lng', lng, { shouldValidate: true, shouldDirty: true });
      setPreviewCenter({ lat, lng });
      toast({ title: "Ciudad Seleccionada", description: `${cityName}${countryName ? `, ${countryName}`: ''} autocompletada.` });
      setForceRenderKey(prev => prev + 1);
      console.log("AddCityDialog DEBUG: form.getValues() after setValue:", form.getValues());
    } else {
      toast({ variant: "destructive", title: "Datos Incompletos", description: "No se pudo obtener toda la información. Intenta de nuevo." });
      console.warn("AddCityDialog DEBUG: Missing essential place data after extraction (name or lat/lng).");
    }
  }, [form, toast, setForceRenderKey, setPreviewCenter]);

  useEffect(() => {
    if (isOpen && isGoogleMapsApiLoaded && !googleMapsApiLoadError && citySearchInputRef.current) {
      if (!autocompleteRef.current) {
        console.log("AddCityDialog DEBUG: Initializing Google Maps Autocomplete on input:", citySearchInputRef.current);
        try {
          const instance = new window.google.maps.places.Autocomplete(
            citySearchInputRef.current,
            {
              types: ['(cities)'],
              fields: ['address_components', 'geometry.location', 'name', 'formatted_address', 'place_id'],
            }
          );
          autocompleteRef.current = instance;
          console.log("AddCityDialog DEBUG: Google Maps JS Autocomplete initialized.", instance);

          if (placeChangedListenerRef.current) {
            window.google.maps.event.removeListener(placeChangedListenerRef.current);
          }
          placeChangedListenerRef.current = instance.addListener('place_changed', handlePlaceSelected);
          console.log("AddCityDialog DEBUG: ADDED 'place_changed' listener.");

        } catch (error) {
          console.error("AddCityDialog DEBUG: Error initializing Google Maps Autocomplete:", error);
          toast({variant: "destructive", title: "Error de Google Maps", description: "No se pudo inicializar autocompletado."})
        }
      }
    }
    
    // Cleanup function
    return () => {
      if (placeChangedListenerRef.current) {
        window.google.maps.event.removeListener(placeChangedListenerRef.current);
        placeChangedListenerRef.current = null;
        console.log("AddCityDialog DEBUG: REMOVED 'place_changed' listener on cleanup/dialog close effect.");
      }
      // Google Maps Autocomplete might add .pac-container elements to the body.
      // It's good practice to remove them if the Autocomplete instance is no longer needed.
      if (!isOpen && autocompleteRef.current) { // Only do full cleanup if dialog is truly closing
          // We don't destroy autocompleteRef.current directly here,
          // as it might be needed if the dialog re-opens quickly.
          // Instead, we ensure listeners are removed.
          // The .pac-container cleanup is safer when dialog truly closes.
          document.querySelectorAll('.pac-container').forEach(elem => elem.remove());
          autocompleteRef.current = null; // Allow re-initialization if component re-mounts or dialog re-opens fresh
          console.log("AddCityDialog DEBUG: Cleaned up .pac-container and Autocomplete instance ref.");
      }
    };
  }, [isOpen, isGoogleMapsApiLoaded, googleMapsApiLoadError, handlePlaceSelected, toast]);

  const handleDialogChange = (open: boolean) => {
    onOpenChange(open);
    if (open) {
      console.log("AddCityDialog DEBUG: Dialog opening/state change. InitialData:", initialData);
      const resetValues = initialData
        ? {
            id: initialData.id,
            name: initialData.name,
            country: initialData.country,
            arrivalDate: initialData.arrivalDate,
            departureDate: initialData.departureDate,
            notes: initialData.notes || '',
            lat: initialData.coordinates.lat,
            lng: initialData.coordinates.lng,
          }
        : { ...defaultNewCityValues, id: undefined };

      form.reset(resetValues);
      console.log("AddCityDialog DEBUG: Form reset with values:", resetValues);

      if (citySearchInputRef.current) {
        citySearchInputRef.current.value = initialData ? `${initialData.name}, ${initialData.country}` : '';
      }
      setPreviewCenter(initialData ? initialData.coordinates : null);
      setForceRenderKey(prev => prev + 1);
    } else {
        // Additional cleanup when dialog explicitly closes via onOpenChange(false)
        if (placeChangedListenerRef.current) {
            window.google.maps.event.removeListener(placeChangedListenerRef.current);
            placeChangedListenerRef.current = null;
        }
        if (autocompleteRef.current) {
            // Detach from input, clear listeners for this specific instance
            // No standard "destroy" but removing listeners is key
            window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
            autocompleteRef.current = null; // Allow re-initialization
        }
        document.querySelectorAll('.pac-container').forEach(elem => elem.remove());
        console.log("AddCityDialog DEBUG: Dialog explicitly closed. Cleaned up listeners and PAC containers.");
    }
  };

  const handleFormSubmit = async (data: CityFormData) => {
    console.log("AddCityDialog DEBUG: handleFormSubmit - Attempting to submit form with data:", data);
    setIsSubmitting(true);
    
    if (typeof data.lat !== 'number' || typeof data.lng !== 'number' ) {
      if (!((data.lat === 0 && data.lng === 0) && initialData && initialData.coordinates.lat === 0 && initialData.coordinates.lng === 0)) {
        toast({
            variant: "destructive",
            title: "Error de Coordenadas",
            description: "Coordenadas no válidas. Selecciona la ciudad del buscador.",
        });
        console.error("AddCityDialog DEBUG: Form submission aborted, invalid or zero coordinates for new/changed city.", data);
        setIsSubmitting(false);
        return;
      }
    }

    try {
      await onSaveCity(data);
      handleDialogChange(false); 
    } catch (error) {
      console.error("AddCityDialog DEBUG: Error submitting city:", error);
      toast({ variant: "destructive", title: "Error al Guardar", description: (error as Error).message || "No se pudo guardar la ciudad." });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const dialogTitle = initialData ? "Editar Ciudad" : "Añadir Nueva Ciudad";
  const dialogDescription = initialData 
    ? "Modifica los detalles de la ciudad. Si cambias la ciudad, usa el buscador."
    : "Busca y selecciona una ciudad para autocompletar los datos. Luego, completa las fechas de tu estancia.";
  const submitButtonText = initialData ? "Guardar Cambios" : "Añadir Ciudad";
  const FormIcon = initialData ? Edit3 : PlusCircle;

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      {/* DialogTrigger is handled by MapSection */}
      <DialogContent className="sm:max-w-lg rounded-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-primary flex items-center">
            <FormIcon size={22} className="mr-2" />
            {dialogTitle}
          </DialogTitle>
          <DialogDescription>
            {dialogDescription}
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
                disabled={!isGoogleMapsApiLoaded || !!googleMapsApiLoadError || !googleMapsApiKey}
                className="text-base"
                defaultValue={initialData ? `${initialData.name}, ${initialData.country}` : ""}
              />
              {!isGoogleMapsApiLoaded && !googleMapsApiLoadError && googleMapsApiKey && <p className="text-xs text-muted-foreground flex items-center pt-1"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Cargando API de Google Maps...</p>}
              {googleMapsApiLoadError && <p className="text-xs text-destructive">Error al cargar Google Maps: {googleMapsApiLoadError.message}</p>}
              {!googleMapsApiKey && <p className="text-xs text-destructive">API Key de Google Maps no configurada.</p>}
            </div>

            <FormField
              key={`name-${forceRenderKey}`}
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><MapPinIconLucide className="mr-2 h-4 w-4 text-muted-foreground" />Nombre Ciudad</FormLabel>
                  <FormControl>
                    <Input placeholder="Se autocompletará" {...field} value={field.value || ''} readOnly className="bg-muted/50"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              key={`country-${forceRenderKey}`}
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
                    <FormLabel>Latitud</FormLabel>
                    <FormControl>
                      <Input type="hidden" {...field} value={field.value || 0} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="lng"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormLabel>Longitud</FormLabel>
                    <FormControl>
                      <Input type="hidden" {...field} value={field.value || 0} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
            />

            {previewCenter && isGoogleMapsApiLoaded && googleMapsApiKey && !googleMapsApiLoadError && (
              <div className="mt-4">
                <FormLabel>Vista Previa del Mapa</FormLabel>
                <div className="mt-1 h-[200px] w-full rounded-md overflow-hidden border">
                  <GoogleMap
                    key={`map-${previewCenter.lat}-${previewCenter.lng}-${forceRenderKey}`}
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
                  <FormLabel className="flex items-center"><StickyNote className="mr-2 h-4 w-4 text-muted-foreground" />Notas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Información adicional sobre esta ciudad..." {...field} value={field.value || ''} className="text-base"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button 
                type="submit" 
                disabled={
                  isSubmitting || 
                  (!isGoogleMapsApiLoaded && !!googleMapsApiKey) || 
                  !!googleMapsApiLoadError ||
                  !googleMapsApiKey ||
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
