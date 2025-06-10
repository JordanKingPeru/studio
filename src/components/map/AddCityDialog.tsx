
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

const GOOGLE_MAPS_LIBRARIES = ['places'] as Array<'places'>;
const GOOGLE_MAPS_SCRIPT_ID = 'app-google-maps-script';

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
  const [forceRenderMapKey, setForceRenderMapKey] = useState(0);
  const [apiLoadStatus, setApiLoadStatus] = useState<'loading' | 'loaded' | 'error' | 'no_key'>('loading');

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
    console.log("AddCityDialog: place_changed event fired. Place data:", place);

    if (!place || !place.geometry || !place.geometry.location || !place.address_components) {
      toast({ variant: "destructive", title: "Selección Inválida", description: "No se pudieron obtener datos completos del lugar. Inténtalo de nuevo." });
      console.warn("AddCityDialog: Place data incomplete from getPlace().", place);
      return;
    }

    let cityName = '';
    let countryName = '';
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    for (const component of place.address_components) {
      if (component.types.includes('locality')) {
        cityName = component.long_name;
      }
      if (component.types.includes('country')) {
        countryName = component.long_name;
      }
    }
    
    // Fallbacks if specific components are not found
    if (!cityName) {
        const adminArea = place.address_components.find(c => c.types.includes('administrative_area_level_1'));
        if (adminArea) cityName = adminArea.long_name;
    }
    if (!cityName && place.name && !place.types?.some(t => ['street_address', 'premise', 'route'].includes(t))) {
        // Use place.name if it seems like a city/region name and not a specific address
        cityName = place.name;
    }


    console.log(`AddCityDialog: Parsed - City: "${cityName}", Country: "${countryName}", Lat: ${lat}, Lng: ${lng}`);

    if (cityName && countryName && typeof lat === 'number' && typeof lng === 'number') {
      form.setValue('name', cityName, { shouldValidate: true, shouldDirty: true });
      form.setValue('country', countryName, { shouldValidate: true, shouldDirty: true });
      form.setValue('lat', lat, { shouldValidate: true, shouldDirty: true });
      form.setValue('lng', lng, { shouldValidate: true, shouldDirty: true });
      setPreviewCenter({ lat, lng });
      setForceRenderMapKey(prev => prev + 1);
      toast({ title: "Ciudad Seleccionada", description: `${cityName}, ${countryName} autocompletada.` });
    } else {
      toast({ variant: "destructive", title: "Datos Incompletos", description: "No se pudo extraer toda la información necesaria (ciudad, país) del lugar seleccionado. Revisa la consola." });
      console.error("AddCityDialog: Failed to extract all necessary place data. Extracted:", { cityName, countryName, lat, lng }, "Original place data:", place);
    }
  }, [form, toast]);

  useEffect(() => {
    if (isOpen && apiLoadStatus === 'loaded' && citySearchInputRef.current && window.google && window.google.maps && window.google.maps.places) {
      if (!autocompleteRef.current) {
        console.log("AddCityDialog: Initializing Google Maps Autocomplete.");
        try {
          const instance = new window.google.maps.places.Autocomplete(
            citySearchInputRef.current,
            {
              types: ['(cities)'],
              fields: ['address_components', 'geometry.location', 'name', 'formatted_address', 'place_id', 'types'],
            }
          );
          autocompleteRef.current = instance;
          
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
    // Cleanup is handled by onOpenChange via `handleDialogChange`
  }, [isOpen, apiLoadStatus, handlePlaceSelected, toast]);

  const handleDialogChange = (open: boolean) => {
    onOpenChange(open);
    if (open) {
      console.log("AddCityDialog: Dialog opened.");
      const resetValues = initialData
        ? { ...initialData, notes: initialData.notes || '', lat: initialData.coordinates.lat, lng: initialData.coordinates.lng }
        : { ...defaultNewCityValues, id: undefined };
      form.reset(resetValues);

      if (citySearchInputRef.current) {
        citySearchInputRef.current.value = initialData ? `${initialData.name}, ${initialData.country}` : '';
      }
      setPreviewCenter(initialData ? initialData.coordinates : null);
      setForceRenderMapKey(prev => prev +1);
    } else {
      console.log("AddCityDialog: Dialog closed. Cleaning up Autocomplete.");
      if (placeChangedListenerRef.current && window.google && window.google.maps) {
        window.google.maps.event.removeListener(placeChangedListenerRef.current);
        placeChangedListenerRef.current = null;
        console.log("AddCityDialog: place_changed listener removed.");
      }
      if (autocompleteRef.current && window.google && window.google.maps) {
        // window.google.maps.event.clearInstanceListeners(autocompleteRef.current); // This sometimes causes issues if instance is already partly torn down
        autocompleteRef.current = null; // Just nullify the ref
        console.log("AddCityDialog: Autocomplete instance reference cleared.");
      }
      const pacContainers = document.querySelectorAll('.pac-container');
      pacContainers.forEach(container => container.remove());
      console.log("AddCityDialog: .pac-container elements removed.");
    }
  };

  const handleFormSubmit = async (data: CityFormData) => {
    setIsSubmitting(true);
    console.log("AddCityDialog: Form submitted with data:", data);
    if (data.lat === 0 && data.lng === 0 && !initialData?.id) {
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
      handleDialogChange(false);
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
    searchInputInfo = <p className="text-xs text-destructive flex items-center pt-1"><AlertTriangle className="h-3 w-3 mr-1" />Error al cargar Google Maps. Revisa tu API Key y los servicios habilitados (Maps JavaScript API & Places API) y la facturación en Google Cloud.</p>;
  } else if (apiLoadStatus === 'no_key') {
    searchInputInfo = <p className="text-xs text-destructive flex items-center pt-1"><AlertTriangle className="h-3 w-3 mr-1" />API Key de Google Maps no configurada en `.env`.</p>;
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
                    const pacContainers = document.querySelectorAll('.pac-container');
                    if (pacContainers.length > 1) { 
                         pacContainers.forEach((container, index) => {
                            if (index < pacContainers.length -1 ) container.remove();
                         });
                    }
                }}
              />
              {searchInputInfo}
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><MapPinIconLucide className="mr-2 h-4 w-4 text-muted-foreground" />Nombre Ciudad</FormLabel>
                  <FormControl>
                    <Input placeholder="Se autocompletará" {...field} />
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
                    <Input placeholder="Se autocompletará" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField control={form.control} name="lat" render={({ field }) => <Input type="hidden" {...field} />} />
            <FormField control={form.control} name="lng" render={({ field }) => <Input type="hidden" {...field} />} />
            { (form.formState.errors.lat || form.formState.errors.lng) && (form.getValues('lat') === 0 && form.getValues('lng') === 0 && !initialData) &&
                <FormMessage>
                    {form.formState.errors.lat?.message || form.formState.errors.lng?.message || "Latitud y longitud son necesarias. Usa el buscador."}
                </FormMessage>
            }

            {apiLoadStatus === 'loaded' && previewCenter && (
              <div className="mt-4">
                <FormLabel>Vista Previa del Mapa</FormLabel>
                <div className="mt-1 h-[200px] w-full rounded-md overflow-hidden border">
                  <GoogleMap
                    key={`preview-map-${previewCenter.lat}-${previewCenter.lng}-${forceRenderMapKey}`}
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
