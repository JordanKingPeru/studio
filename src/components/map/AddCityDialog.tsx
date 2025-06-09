
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
  DialogTrigger,
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
      ...initialData,
      notes: initialData.notes || '',
    } : defaultNewCityValues,
  });

  const handlePlaceSelected = useCallback(() => {
    console.log("AddCityDialog DEBUG: handlePlaceSelected CALLED.");
    if (!autocompleteRef.current) {
      console.error("AddCityDialog DEBUG: Autocomplete instance is null in handlePlaceSelected.");
      toast({ variant: "destructive", title: "Error de Autocompletado", description: "La instancia de autocompletado no está disponible." });
      return;
    }

    const place = autocompleteRef.current.getPlace();
    console.log("AddCityDialog DEBUG: Raw Google PlaceResult:", JSON.stringify(place, null, 2));

    if (!place || Object.keys(place).length === 0) {
      console.warn("AddCityDialog DEBUG: No place selected or place data is empty.");
      toast({ variant: "destructive", title: "Selección Inválida", description: "No se seleccionó ningún lugar o los datos del lugar están vacíos." });
      return;
    }

    let cityName = place.name || '';
    let countryName = '';
    const lat = place.geometry?.location?.lat();
    const lng = place.geometry?.location?.lng();

    if (place.address_components) {
      const countryComponent = place.address_components.find(component => component.types.includes('country'));
      countryName = countryComponent ? countryComponent.long_name : '';
      
      if (!cityName) {
         const cityComponent = place.address_components.find(component => component.types.includes('locality') || component.types.includes('administrative_area_level_1'));
         if (cityComponent) cityName = cityComponent.long_name;
      }
    } else {
        console.warn("AddCityDialog DEBUG: place.address_components is undefined.");
    }
    
    // Fallback if name is still empty but formatted_address exists
    if (!cityName && place.formatted_address) {
        cityName = place.formatted_address.split(',')[0]; // Basic fallback
        console.log("AddCityDialog DEBUG: Fallback cityName from formatted_address:", cityName);
    }


    console.log(`AddCityDialog DEBUG: Extracted Values - Name: "${cityName}", Country: "${countryName}", Lat: ${lat}, Lng: ${lng}`);

    if (cityName && countryName && typeof lat === 'number' && typeof lng === 'number') {
      form.setValue('name', cityName, { shouldValidate: true, shouldDirty: true });
      form.setValue('country', countryName, { shouldValidate: true, shouldDirty: true });
      form.setValue('lat', lat, { shouldValidate: true, shouldDirty: true });
      form.setValue('lng', lng, { shouldValidate: true, shouldDirty: true });
      setPreviewCenter({ lat, lng });
      toast({ title: "Ciudad Seleccionada", description: `${cityName}, ${countryName} autocompletada.` });
      console.log("AddCityDialog DEBUG: form.getValues() after setValue:", form.getValues());
    } else {
      toast({ variant: "destructive", title: "Datos Incompletos", description: "No se pudo obtener toda la información de la ciudad. Inténtalo de nuevo o verifica la selección." });
      console.warn("AddCityDialog DEBUG: Missing essential place data after extraction:", { cityName, countryName, lat, lng });
      // Optionally reset to defaults or keep previous valid values if editing
      if (!initialData) {
        form.setValue('name', '', { shouldValidate: true });
        form.setValue('country', '', { shouldValidate: true });
        form.setValue('lat', 0, { shouldValidate: true });
        form.setValue('lng', 0, { shouldValidate: true });
        setPreviewCenter(null);
      }
    }
    setForceRenderKey(prev => prev + 1);
  }, [form, toast, initialData]);

  useEffect(() => {
    if (isOpen && isGoogleMapsApiLoaded && !googleMapsApiLoadError && citySearchInputRef.current && !autocompleteRef.current) {
      console.log("AddCityDialog DEBUG: Initializing Google Maps Autocomplete on input:", citySearchInputRef.current);
      try {
        const autocompleteInstance = new window.google.maps.places.Autocomplete(
          citySearchInputRef.current,
          {
            types: ['(cities)'],
            fields: ['address_components', 'geometry.location', 'name', 'formatted_address', 'place_id'],
          }
        );
        autocompleteRef.current = autocompleteInstance;
        console.log("AddCityDialog DEBUG: Google Maps JS Autocomplete initialized.", autocompleteInstance);

        if (placeChangedListenerRef.current) {
          google.maps.event.removeListener(placeChangedListenerRef.current);
          console.log("AddCityDialog DEBUG: Removed PREVIOUS 'place_changed' listener.");
        }
        placeChangedListenerRef.current = autocompleteInstance.addListener('place_changed', handlePlaceSelected);
        console.log("AddCityDialog DEBUG: ADDED 'place_changed' listener.");

      } catch (error) {
        console.error("AddCityDialog DEBUG: Error initializing Google Maps Autocomplete:", error);
        toast({variant: "destructive", title: "Error de Google Maps", description: "No se pudo inicializar el autocompletado."})
      }
    }

    // Cleanup when dialog is closed or dependencies change that should stop autocomplete
    if (!isOpen && autocompleteRef.current) {
        console.log("AddCityDialog DEBUG: Dialog closed. Cleaning up Autocomplete instance and listener.");
        if (placeChangedListenerRef.current) {
          google.maps.event.removeListener(placeChangedListenerRef.current);
          placeChangedListenerRef.current = null;
          console.log("AddCityDialog DEBUG: Removed 'place_changed' listener due to dialog close.");
        }
        // Detach the Autocomplete instance from the input
        // No direct 'destroy' or 'detach' method. Clearing listeners and nullifying ref is best.
        // Google also adds .pac-container elements to the body, clean them up.
        document.querySelectorAll('.pac-container').forEach(elem => elem.remove());
        autocompleteRef.current = null; // Allow re-initialization if dialog reopens
        console.log("AddCityDialog DEBUG: Cleared Autocomplete instance and PAC containers.");
    }
    
    // General cleanup on component unmount
    return () => {
      console.log("AddCityDialog DEBUG: Component unmounting or useEffect re-running. Cleanup attempt.");
      if (placeChangedListenerRef.current) {
        console.log("AddCityDialog DEBUG: Cleanup - Removing 'place_changed' listener from ref.");
        google.maps.event.removeListener(placeChangedListenerRef.current);
        placeChangedListenerRef.current = null;
      }
      if (autocompleteRef.current) {
         console.log("AddCityDialog DEBUG: Cleanup - Nullifying autocompleteRef.");
        // No direct 'destroy'. Event listeners on the instance are cleared above.
        autocompleteRef.current = null;
      }
      document.querySelectorAll('.pac-container').forEach(elem => elem.remove());
    };
  }, [isOpen, isGoogleMapsApiLoaded, googleMapsApiLoadError, handlePlaceSelected, toast]);


  const handleDialogChange = (open: boolean) => {
    onOpenChange(open);
    if (open) {
      console.log("AddCityDialog DEBUG: Dialog opening. Resetting form. InitialData:", initialData);
      const defaultValues = initialData 
        ? { id: initialData.id, name: initialData.name, country: initialData.country, arrivalDate: initialData.arrivalDate, departureDate: initialData.departureDate, notes: initialData.notes || '', lat: initialData.coordinates.lat, lng: initialData.coordinates.lng }
        : { ...defaultNewCityValues, id: undefined };
      
      form.reset(defaultValues);
      
      if (initialData && (initialData.coordinates.lat !== 0 || initialData.coordinates.lng !== 0)) {
        setPreviewCenter(initialData.coordinates);
      } else {
        setPreviewCenter(null);
      }
      
      if (citySearchInputRef.current) {
        citySearchInputRef.current.value = initialData ? `${initialData.name}, ${initialData.country}` : '';
      }
      setForceRenderKey(prev => prev + 1);
      console.log("AddCityDialog DEBUG: Form reset. Current form values:", form.getValues());
    } else {
      console.log("AddCityDialog DEBUG: Dialog closing.");
      // Cleanup logic moved to main useEffect for better control based on isOpen
    }
  };

  const handleFormSubmit = async (data: CityFormData) => {
    console.log("AddCityDialog DEBUG: handleFormSubmit - Attempting to submit form with data:", data);
    setIsSubmitting(true);
    
    if (typeof data.lat !== 'number' || typeof data.lng !== 'number' || data.lat === 0 && data.lng === 0 && !initialData) { // Allow 0,0 if editing existing city with those coords
      const latIsInvalid = typeof data.lat !== 'number' || (data.lat === 0 && !initialData?.coordinates?.lat); // Allow 0 if it was original
      const lngIsInvalid = typeof data.lng !== 'number' || (data.lng === 0 && !initialData?.coordinates?.lng); // Allow 0 if it was original

      if(latIsInvalid || lngIsInvalid){
        toast({
            variant: "destructive",
            title: "Error de Coordenadas",
            description: "Las coordenadas de la ciudad no son válidas. Por favor, selecciona la ciudad nuevamente desde el buscador.",
        });
        console.error("AddCityDialog DEBUG: Form submission aborted, missing or invalid coordinates.", data);
        setIsSubmitting(false);
        return;
      }
    }

    try {
      await onSaveCity(data);
      // Toast message is handled by the parent component (DashboardView) after successful save
      handleDialogChange(false); // Close dialog
    } catch (error) {
      console.error("AddCityDialog DEBUG: Error submitting city:", error);
      // Toast for submission error is also handled by parent or here if needed
      toast({ variant: "destructive", title: "Error al Guardar", description: (error as Error).message });
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
              <FormLabel htmlFor="city-search-dialog-input" className="flex items-center"><Search className="mr-2 h-4 w-4 text-muted-foreground" />Buscar Ciudad</FormLabel>
              <Input
                id="city-search-dialog-input" // Changed ID to avoid conflict if MapSection also has one
                ref={citySearchInputRef}
                placeholder="Ej: París, Francia"
                disabled={!isGoogleMapsApiLoaded || !!googleMapsApiLoadError || !googleMapsApiKey}
                className="text-base"
              />
              {!isGoogleMapsApiLoaded && !googleMapsApiLoadError && googleMapsApiKey && <p className="text-xs text-muted-foreground flex items-center pt-1"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Cargando API de Google Maps...</p>}
              {googleMapsApiLoadError && <p className="text-xs text-destructive">Error al cargar Google Maps: {googleMapsApiLoadError.message}</p>}
              {!googleMapsApiKey && <p className="text-xs text-destructive">API Key de Google Maps no configurada.</p>}
            </div>

            <FormField
              key={`city-name-${forceRenderKey}`}
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
                <FormItem className="hidden"> {/* Keep as FormItem for context */}
                  <FormLabel>Latitud (oculto)</FormLabel>
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
                 <FormItem className="hidden"> {/* Keep as FormItem for context */}
                  <FormLabel>Longitud (oculto)</FormLabel>
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
                    key={`${previewCenter.lat}-${previewCenter.lng}`} // Force re-render if center changes
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
                  !isGoogleMapsApiLoaded || 
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

