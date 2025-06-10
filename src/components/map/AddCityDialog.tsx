
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
import { Globe, MapPin as MapPinIconLucide, CalendarIcon, StickyNote, Search, Loader2, PlusCircle, Edit3, AlertTriangle } from 'lucide-react';
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
  borderRadius: '0.375rem', // Corresponds to Tailwind's rounded-md
};

const defaultNewCityValues: Omit<CityFormData, 'id'> = {
  name: '',
  country: '',
  arrivalDate: new Date().toISOString().split('T')[0],
  departureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 7 days later
  notes: '',
  lat: 0, // Default, should be updated by search
  lng: 0, // Default, should be updated by search
};

const GOOGLE_MAPS_LIBRARIES = ['places'] as Array<'places'>; // Consistent libraries
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
  const [forceRenderMapKey, setForceRenderMapKey] = useState(0); // To help with re-rendering map
  const [apiLoadStatus, setApiLoadStatus] = useState<'loading' | 'loaded' | 'error' | 'no_key'>('loading');

  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_SCRIPT_ID, // Use consistent ID
    googleMapsApiKey: googleMapsApiKey || '',
    libraries: GOOGLE_MAPS_LIBRARIES, // Use consistent libraries
    preventGoogleFontsLoading: true,
  });

  const citySearchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const placeChangedListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  const form = useForm<CityFormData>({
    resolver: zodResolver(cityFormSchema),
    defaultValues: initialData
      ? { ...initialData, notes: initialData.notes || '', lat: initialData.coordinates.lat, lng: initialData.coordinates.lng }
      : { ...defaultNewCityValues, id: undefined }
  });

  useEffect(() => {
    if (!googleMapsApiKey) {
      setApiLoadStatus('no_key');
      console.warn("AddCityDialog: Google Maps API Key not provided.");
      return;
    }
    if (isLoaded) {
      setApiLoadStatus('loaded');
      console.log("AddCityDialog: Google Maps API script loaded successfully.");
    }
    if (loadError) {
      setApiLoadStatus('error');
      console.error("AddCityDialog: Google Maps API load error:", loadError);
    }
  }, [isLoaded, loadError, googleMapsApiKey]);

  const handlePlaceSelected = useCallback(() => {
    if (!autocompleteRef.current) {
      console.error("AddCityDialog: Autocomplete instance not found in handlePlaceSelected.");
      toast({ variant: "destructive", title: "Error de Autocompletado", description: "La instancia de autocompletado no está disponible." });
      return;
    }
    const place = autocompleteRef.current.getPlace();
    console.log("AddCityDialog: place_changed event fired.");
    // Log the raw place object. Use JSON.parse(JSON.stringify()) for a deep copy that's easy to inspect.
    console.log("AddCityDialog: Raw Place object from Google:", JSON.parse(JSON.stringify(place)));


    if (!place || !place.geometry || !place.geometry.location || !place.address_components) {
      toast({ variant: "destructive", title: "Selección Inválida", description: "No se pudieron obtener datos completos del lugar. Inténtalo de nuevo." });
      console.warn("AddCityDialog: Place data incomplete from getPlace(). Place object:", place);
      return;
    }

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    let cityName = '';
    let countryName = '';
    let adminAreaLevel1Name = ''; // For state/province, potential fallback for city

    console.log("AddCityDialog: Extracting from address_components:", place.address_components);

    for (const component of place.address_components) {
      if (component.types.includes('locality')) {
        cityName = component.long_name;
        console.log(`AddCityDialog: Found city (locality): ${cityName}`);
      }
      if (component.types.includes('administrative_area_level_1') && !cityName) { // Only use if city is not already found by locality
        adminAreaLevel1Name = component.long_name;
        console.log(`AddCityDialog: Found admin_area_level_1: ${adminAreaLevel1Name}`);
      }
      if (component.types.includes('country')) {
        countryName = component.long_name;
        console.log(`AddCityDialog: Found country: ${countryName}`);
      }
    }
    
    // If locality wasn't found, try admin_area_level_1
    if (!cityName && adminAreaLevel1Name) {
        cityName = adminAreaLevel1Name;
        console.log(`AddCityDialog: Using admin_area_level_1 as city: ${cityName}`);
    }
    // As a last resort for city name, if still empty, and place.name seems generic enough (not a street/business)
    if (!cityName && place.name && !place.types?.some(t => ['street_address', 'premise', 'route', 'establishment', 'point_of_interest', 'airport', 'bus_station', 'train_station'].includes(t))) {
        cityName = place.name;
        console.log(`AddCityDialog: Using place.name as city: ${cityName}`);
    }

    console.log(`AddCityDialog: Final extracted - City: "${cityName}", Country: "${countryName}", Lat: ${lat}, Lng: ${lng}`);

    if (cityName && countryName && typeof lat === 'number' && typeof lng === 'number') {
      form.setValue('name', cityName, { shouldValidate: true, shouldDirty: true });
      form.setValue('country', countryName, { shouldValidate: true, shouldDirty: true });
      form.setValue('lat', lat, { shouldValidate: true, shouldDirty: true });
      form.setValue('lng', lng, { shouldValidate: true, shouldDirty: true });
      setPreviewCenter({ lat, lng });
      setForceRenderMapKey(prev => prev + 1); // Force map re-render with new center/marker
      if (citySearchInputRef.current) {
        citySearchInputRef.current.value = `${cityName}, ${countryName}`; // Update search input text
      }
      toast({ title: "Ciudad Seleccionada", description: `${cityName}, ${countryName} autocompletada.` });
    } else {
      toast({ variant: "destructive", title: "Datos Incompletos", description: "No se pudo extraer toda la información necesaria (ciudad, país) del lugar seleccionado. Revisa los logs de la consola." });
      console.error("AddCityDialog: Failed to extract all necessary place data. Extracted:", { cityName, countryName, lat, lng }, "Original place data:", place);
    }
  }, [form, toast]);

  useEffect(() => {
    // This effect handles the initialization of the Google Maps Autocomplete service
    if (isOpen && apiLoadStatus === 'loaded' && citySearchInputRef.current && window.google && window.google.maps && window.google.maps.places) {
      if (!autocompleteRef.current) { // Initialize only if not already initialized
        console.log("AddCityDialog: Initializing Google Maps Autocomplete.");
        try {
          const instance = new window.google.maps.places.Autocomplete(
            citySearchInputRef.current,
            {
              types: ['(cities)'], // Restrict search to cities
              fields: ['address_components', 'geometry.location', 'name', 'formatted_address', 'place_id', 'types'], // Specify fields to reduce data cost
            }
          );
          autocompleteRef.current = instance;
          
          // Clear any existing listener before adding a new one
          if (placeChangedListenerRef.current) {
            window.google.maps.event.removeListener(placeChangedListenerRef.current);
          }
          placeChangedListenerRef.current = instance.addListener('place_changed', handlePlaceSelected);
          console.log("AddCityDialog: Autocomplete initialized and listener added.");
        } catch (error) {
          console.error("AddCityDialog: Error initializing Google Maps Autocomplete:", error);
          toast({variant: "destructive", title: "Error de Google Maps", description: "No se pudo inicializar el autocompletado."});
        }
      }
    }
    // Cleanup (detaching listener, nullifying refs) is handled by `handleDialogChange` when `isOpen` becomes false.
  }, [isOpen, apiLoadStatus, handlePlaceSelected, toast]); // `googleMapsApiKey` dependency removed as it's for initial load, not re-init per key change here.

  const handleDialogChange = (open: boolean) => {
    onOpenChange(open);
    if (open) {
      console.log("AddCityDialog: Dialog opened.");
      const resetValues = initialData
        ? { ...initialData, notes: initialData.notes || '', lat: initialData.coordinates.lat, lng: initialData.coordinates.lng }
        : { ...defaultNewCityValues, id: undefined };
      form.reset(resetValues);

      // Set search input value if editing
      if (citySearchInputRef.current) {
        citySearchInputRef.current.value = initialData ? `${initialData.name}, ${initialData.country}` : '';
      }
      setPreviewCenter(initialData ? initialData.coordinates : null);
      setForceRenderMapKey(prev => prev +1); // Ensure map re-renders correctly on open
    } else {
      console.log("AddCityDialog: Dialog closed. Cleaning up Autocomplete.");
      // Remove the 'place_changed' event listener
      if (placeChangedListenerRef.current && window.google && window.google.maps) {
        window.google.maps.event.removeListener(placeChangedListenerRef.current);
        placeChangedListenerRef.current = null;
        console.log("AddCityDialog: place_changed listener removed.");
      }
      // Nullify the Autocomplete instance reference
      if (autocompleteRef.current) {
        // Detaching from input element might be needed if Google's lib doesn't clean up itself well
        // For example, by clearing specific attributes Google might set on the input
        // However, simply nullifying the ref and re-creating on open is often sufficient.
        autocompleteRef.current = null;
        console.log("AddCityDialog: Autocomplete instance reference cleared.");
      }
      // Attempt to remove any stray PAC (Predictions AutoComplete) containers
      const pacContainers = document.querySelectorAll('.pac-container');
      pacContainers.forEach(container => {
        if (document.body.contains(container)) { // Check if it's still in DOM
          container.remove();
        }
      });
      console.log("AddCityDialog: .pac-container elements attempted removal.");
    }
  };

  const handleFormSubmit = async (data: CityFormData) => {
    setIsSubmitting(true);
    console.log("AddCityDialog: Form submitted with data:", data);
    // Basic validation for new cities to ensure lat/lng are not default (0,0) unless explicitly set by a rare case
    if (data.lat === 0 && data.lng === 0 && !initialData?.id) {
      // Check if lat/lng were actually part of the dirty fields (user input or autocomplete)
      // If not, it means they are still default values, which is an error
      if (!(form.formState.dirtyFields.lat || form.formState.dirtyFields.lng)) {
        toast({
            variant: "destructive",
            title: "Coordenadas Inválidas",
            description: "Por favor, selecciona una ciudad del buscador para obtener coordenadas válidas.",
        });
        form.setError("lat", {type: "manual", message: "Selecciona una ciudad del buscador."});
        form.setError("lng", {type: "manual", message: "Selecciona una ciudad del buscador."});
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

  let searchInputInfo: React.ReactNode = null;
  if (apiLoadStatus === 'loading' && googleMapsApiKey) {
    searchInputInfo = <p className="text-xs text-muted-foreground flex items-center pt-1"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Cargando API de Google Maps...</p>;
  } else if (apiLoadStatus === 'error') {
    searchInputInfo = <p className="text-xs text-destructive flex items-center pt-1"><AlertTriangle className="h-3 w-3 mr-1" />Error al cargar Google Maps. Revisa tu API Key, los servicios habilitados (Maps JavaScript API & Places API), la facturación en Google Cloud y las restricciones de la clave.</p>;
  } else if (apiLoadStatus === 'no_key') {
    searchInputInfo = <p className="text-xs text-destructive flex items-center pt-1"><AlertTriangle className="h-3 w-3 mr-1" />API Key de Google Maps no configurada en el archivo `.env`.</p>;
  }


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
            {/* City Search Input */}
            <div className="space-y-1">
              <FormLabel htmlFor="city-search-input" className="flex items-center"><Search className="mr-2 h-4 w-4 text-muted-foreground" />Buscar Ciudad</FormLabel>
              <Input
                id="city-search-input"
                ref={citySearchInputRef}
                placeholder="Ej: París, Francia"
                disabled={apiLoadStatus !== 'loaded'}
                className="text-base"
                defaultValue={initialData ? `${initialData.name}, ${initialData.country}` : ""}
                onFocus={(e) => {
                    // Attempt to remove existing PAC containers if multiple appear
                    const pacContainers = document.querySelectorAll('.pac-container');
                    if (pacContainers.length > 1) { // If more than one, assume some are stale
                         console.log("AddCityDialog: Multiple .pac-container elements found on focus. Removing extras.");
                         pacContainers.forEach((container, index) => {
                            // Heuristic: keep the last one, remove others. Or remove all and let Google recreate.
                            // For now, let's try removing all but the last one.
                            if (index < pacContainers.length -1 && document.body.contains(container) ) container.remove();
                         });
                    }
                }}
              />
              {searchInputInfo}
            </div>

            {/* Form Fields */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><MapPinIconLucide className="mr-2 h-4 w-4 text-muted-foreground" />Nombre Ciudad</FormLabel>
                  <FormControl>
                    <Input placeholder="Se autocompletará al buscar" {...field} readOnly={!form.formState.dirtyFields.name && !!field.value} />
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
                    <Input placeholder="Se autocompletará al buscar" {...field} readOnly={!form.formState.dirtyFields.country && !!field.value} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Hidden fields for lat/lng, mainly for validation display */}
            <FormField control={form.control} name="lat" render={({ field }) => <Input type="hidden" {...field} />} />
            <FormField control={form.control} name="lng" render={({ field }) => <Input type="hidden" {...field} />} />
            { (form.formState.errors.lat || form.formState.errors.lng) && 
              (form.getValues('lat') === 0 && form.getValues('lng') === 0 && !initialData) &&
                <FormMessage>
                    {form.formState.errors.lat?.message || form.formState.errors.lng?.message || "Latitud y longitud son necesarias. Usa el buscador."}
                </FormMessage>
            }

            {/* Map Preview */}
            {apiLoadStatus === 'loaded' && previewCenter && (
              <div className="mt-4">
                <FormLabel>Vista Previa del Mapa</FormLabel>
                <div className="mt-1 h-[200px] w-full rounded-md overflow-hidden border">
                  <GoogleMap
                    key={`preview-map-${previewCenter.lat}-${previewCenter.lng}-${forceRenderMapKey}`} // Dynamic key to force re-render
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

            {/* Date Fields */}
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

            {/* Notes Field */}
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
                disabled={isSubmitting || apiLoadStatus !== 'loaded'}
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

