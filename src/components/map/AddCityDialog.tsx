
"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
import { GoogleMap, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { useToast } from "@/hooks/use-toast";
import type { City, Coordinates } from '@/lib/types';

const cityFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "El nombre de la ciudad es obligatorio."),
  country: z.string().min(1, "El país es obligatorio."),
  arrivalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  notes: z.string().optional(),
  lat: z.number({ errorMap: () => ({ message: "La latitud es necesaria. Selecciona una ciudad del buscador." }) }).min(-90, "Latitud inválida").max(90, "Latitud inválida"),
  lng: z.number({ errorMap: () => ({ message: "La longitud es necesaria. Selecciona una ciudad del buscador." }) }).min(-180, "Longitud inválida").max(180, "Longitud inválida"),
});

export type CityFormData = z.infer<typeof cityFormSchema>;

interface AddCityDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSaveCity: (cityData: CityFormData) => Promise<void>;
  googleMapsApiKey: string | undefined;
  initialData?: City | null;
}

const mapContainerStyle = {
  width: '100%',
  height: '200px',
  borderRadius: '0.375rem', // Corresponds to rounded-md
};

const defaultNewCityValues: Omit<CityFormData, 'id'> = {
  name: '',
  country: '',
  arrivalDate: new Date().toISOString().split('T')[0],
  departureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  notes: '',
  // Default to 0,0 but ensure validation catches it if not changed by autocomplete
  lat: 0, 
  lng: 0,
};

const GOOGLE_MAPS_LIBRARIES = ['places'] as Array<'places'>; // Define libraries consistently
const GOOGLE_MAPS_SCRIPT_ID = 'app-google-maps-script'; // Consistent script ID

export default function AddCityDialog({
  isOpen,
  onOpenChange,
  onSaveCity,
  googleMapsApiKey,
  initialData,
}: AddCityDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewCenter, setPreviewCenter] = useState<Coordinates | null>(null);
  const [forceRenderKey, setForceRenderKey] = useState(0); // To help with re-rendering map

  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_SCRIPT_ID,
    googleMapsApiKey: googleMapsApiKey || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
    preventGoogleFontsLoading: true,
  });

  const citySearchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const placeChangedListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  const form = useForm<CityFormData>({
    resolver: zodResolver(cityFormSchema),
    defaultValues: initialData
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
      : { ...defaultNewCityValues, id: undefined }
  });

  const handlePlaceSelected = useCallback(() => {
    console.log("AddCityDialog: handlePlaceSelected triggered");
    if (!autocompleteRef.current) {
      toast({ variant: "destructive", title: "Error de Autocompletado", description: "Instancia no disponible." });
      console.error("AddCityDialog: Autocomplete instance not found in handlePlaceSelected.");
      return;
    }
    const place = autocompleteRef.current.getPlace();
    console.log("AddCityDialog: place from getPlace():", place);

    if (!place || !place.geometry || !place.geometry.location) {
      toast({ variant: "destructive", title: "Selección Inválida", description: "Datos del lugar incompletos. Intenta de nuevo o ingresa manualmente." });
      console.warn("AddCityDialog: Place data incomplete from getPlace().", place);
      return;
    }

    let cityName = place.name || '';
    let countryName = '';
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    if (place.address_components) {
      const countryComponent = place.address_components.find(component => component.types.includes('country'));
      countryName = countryComponent ? countryComponent.long_name : '';

      if (!cityName || (place.types && (place.types.includes('administrative_area_level_1') || place.types.includes('administrative_area_level_2')) && !place.types.includes('locality'))){
         const cityComponent = place.address_components.find(component => component.types.includes('locality') || component.types.includes('postal_town'));
         if (cityComponent) cityName = cityComponent.long_name;
         else if (!cityName && place.formatted_address) cityName = place.formatted_address.split(',')[0];
      }
    } else if (place.formatted_address && !cityName) {
        cityName = place.formatted_address.split(',')[0];
    }

    console.log(`AddCityDialog: Parsed - City: ${cityName}, Country: ${countryName}, Lat: ${lat}, Lng: ${lng}`);

    if (cityName && typeof lat === 'number' && typeof lng === 'number') {
      form.setValue('name', cityName, { shouldValidate: true, shouldDirty: true });
      form.setValue('country', countryName || 'País no especificado', { shouldValidate: true, shouldDirty: true });
      form.setValue('lat', lat, { shouldValidate: true, shouldDirty: true });
      form.setValue('lng', lng, { shouldValidate: true, shouldDirty: true });
      setPreviewCenter({ lat, lng });
      setForceRenderKey(prev => prev + 1);
      toast({ title: "Ciudad Seleccionada", description: `${cityName}${countryName ? `, ${countryName}`: ''} autocompletada.` });
    } else {
      toast({ variant: "destructive", title: "Datos Incompletos", description: "No se pudo obtener toda la información. Intenta de nuevo." });
      console.error("AddCityDialog: Failed to extract all necessary place data.");
    }
  }, [form, toast]);

  useEffect(() => {
    console.log(`AddCityDialog Effect: isOpen=${isOpen}, isLoaded=${isLoaded}, loadError=${loadError}`);
    if (isOpen && isLoaded && !loadError && citySearchInputRef.current && window.google && window.google.maps && window.google.maps.places) {
      if (!autocompleteRef.current) {
        console.log("AddCityDialog: Initializing Google Maps Autocomplete");
        try {
          const instance = new window.google.maps.places.Autocomplete(
            citySearchInputRef.current,
            {
              types: ['(cities)'],
              fields: ['address_components', 'geometry.location', 'name', 'formatted_address', 'place_id', 'types'],
            }
          );
          autocompleteRef.current = instance;
          
          if (placeChangedListenerRef.current) { // Clear any old listener just in case
            window.google.maps.event.removeListener(placeChangedListenerRef.current);
          }
          placeChangedListenerRef.current = instance.addListener('place_changed', handlePlaceSelected);
          console.log("AddCityDialog: Autocomplete initialized and listener added.");

        } catch (error) {
          console.error("AddCityDialog: Error initializing Google Maps Autocomplete:", error);
          toast({variant: "destructive", title: "Error de Google Maps", description: "No se pudo inicializar autocompletado."})
        }
      } else {
        console.log("AddCityDialog: Autocomplete instance already exists.");
      }
    } else if (!isOpen) {
      // Cleanup when dialog is explicitly closed, handled by onOpenChange callback
    } else if (loadError) {
        console.error("AddCityDialog: Google Maps API load error:", loadError);
        toast({variant: "destructive", title: "Error API Google Maps", description: `No se pudo cargar la API de Google Maps: ${loadError.message}. Revisa tu API Key y los servicios habilitados en Google Cloud.`});
    } else if (!isLoaded && googleMapsApiKey) {
        console.log("AddCityDialog: Google Maps API loading...");
    } else if (!googleMapsApiKey) {
        console.warn("AddCityDialog: Google Maps API Key not provided.");
    }


    // The primary cleanup is handled by onOpenChange via `handleDialogChange`
    // This useEffect cleanup is more for when dependencies change while dialog is open, or component unmounts
    return () => {
      if (placeChangedListenerRef.current) {
        // console.log("AddCityDialog Effect Cleanup: Removing place_changed listener");
        // window.google.maps.event.removeListener(placeChangedListenerRef.current);
        // placeChangedListenerRef.current = null;
        // Don't nullify here if full cleanup is in handleDialogChange for !isOpen
      }
    };
  }, [isOpen, isLoaded, loadError, handlePlaceSelected, toast, googleMapsApiKey]);

  const handleDialogChange = (open: boolean) => {
    onOpenChange(open); // Call the prop
    if (open) {
      console.log("AddCityDialog: Dialog opened.");
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

      if (citySearchInputRef.current) {
        citySearchInputRef.current.value = initialData ? `${initialData.name}, ${initialData.country}` : '';
      }
      setPreviewCenter(initialData ? initialData.coordinates : null);
      setForceRenderKey(prev => prev +1);
    } else {
        console.log("AddCityDialog: Dialog closed. Cleaning up Autocomplete.");
        if (placeChangedListenerRef.current) {
            window.google.maps.event.removeListener(placeChangedListenerRef.current);
            placeChangedListenerRef.current = null;
            console.log("AddCityDialog: place_changed listener removed.");
        }
        if (autocompleteRef.current) {
            window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
            autocompleteRef.current = null;
            console.log("AddCityDialog: Autocomplete instance cleared and listeners removed.");
        }
        // Remove PAC (Predictions Autocomplete Container) containers to prevent duplicates or visual glitches
        const pacContainers = document.querySelectorAll('.pac-container');
        pacContainers.forEach(container => container.remove());
        console.log("AddCityDialog: .pac-container elements removed.");
    }
  };

  const handleFormSubmit = async (data: CityFormData) => {
    setIsSubmitting(true);
    console.log("AddCityDialog: Form submitted with data:", data);
    // Check if lat/lng are still default (0,0) and not explicitly set by user for an existing city
    // For new cities, lat/lng must be changed from 0,0 by autocomplete.
    if (data.lat === 0 && data.lng === 0 && !initialData?.id) {
         if (!(form.formState.dirtyFields.lat || form.formState.dirtyFields.lng)) {
            toast({
                variant: "destructive",
                title: "Coordenadas Inválidas",
                description: "Por favor, selecciona una ciudad del buscador para obtener coordenadas válidas.",
            });
            form.setError("lat", {type: "manual", message: "Selecciona una ciudad."});
            form.setError("lng", {type: "manual", message: "Selecciona una ciudad."});
            setIsSubmitting(false);
            return;
         }
    }


    try {
      await onSaveCity(data);
      handleDialogChange(false); // Close dialog on successful save
    } catch (error) {
      console.error("AddCityDialog: Error saving city:", error);
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
                disabled={!isLoaded || !!loadError || !googleMapsApiKey}
                className="text-base"
                defaultValue={initialData ? `${initialData.name}, ${initialData.country}` : ""}
                onFocus={(e) => {
                    // Attempt to clear stale .pac-containers on focus if any remain
                    const pacContainers = document.querySelectorAll('.pac-container');
                    if (pacContainers.length > 1) { // More than 1 implies stale ones
                         pacContainers.forEach((container, index) => {
                            if (index < pacContainers.length -1 ) container.remove();
                         });
                    }
                }}
              />
              {!isLoaded && !loadError && googleMapsApiKey && <p className="text-xs text-muted-foreground flex items-center pt-1"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Cargando API de Google Maps...</p>}
              {loadError && <p className="text-xs text-destructive">Error al cargar Google Maps: {loadError.message}. Revisa la configuración de tu API Key.</p>}
              {!googleMapsApiKey && <p className="text-xs text-destructive">API Key de Google Maps no configurada.</p>}
            </div>

            <FormField
              key={`name-${form.watch('id') || 'new'}`} // Add key to help re-render if id changes
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><MapPinIconLucide className="mr-2 h-4 w-4 text-muted-foreground" />Nombre Ciudad</FormLabel>
                  <FormControl>
                    <Input placeholder="Se autocompletará" {...field} readOnly={!form.formState.dirtyFields.name} className={!form.formState.dirtyFields.name ? "bg-muted/50" : ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              key={`country-${form.watch('id') || 'new'}`}
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Globe className="mr-2 h-4 w-4 text-muted-foreground" />País</FormLabel>
                  <FormControl>
                    <Input placeholder="Se autocompletará" {...field} readOnly={!form.formState.dirtyFields.country} className={!form.formState.dirtyFields.country ? "bg-muted/50" : ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Hidden fields for lat/lng, their values are set by Autocomplete and validated */}
            <FormField control={form.control} name="lat" render={({ field }) => <Input type="hidden" {...field} />} />
            <FormField control={form.control} name="lng" render={({ field }) => <Input type="hidden" {...field} />} />
            { (form.formState.errors.lat || form.formState.errors.lng) && (form.getValues('lat') === 0 && form.getValues('lng') === 0) &&
                <FormMessage>
                    {(form.formState.errors.lat?.message as string) || (form.formState.errors.lng?.message as string) || "Latitud y longitud son necesarias. Usa el buscador."}
                </FormMessage>
            }


            {isLoaded && googleMapsApiKey && !loadError && previewCenter && (
              <div className="mt-4">
                <FormLabel>Vista Previa del Mapa</FormLabel>
                <div className="mt-1 h-[200px] w-full rounded-md overflow-hidden border">
                  <GoogleMap
                    key={`preview-map-${previewCenter.lat}-${previewCenter.lng}-${forceRenderKey}`}
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
                    <Textarea placeholder="Información adicional sobre esta ciudad..." {...field} className="text-base"/>
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
                  (!isLoaded && !!googleMapsApiKey) || // Disable if API key exists but not loaded
                  !!loadError ||
                  !googleMapsApiKey // Disable if no API key at all
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
