
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
  const [forceRenderMapKey, setForceRenderMapKey] = useState(0); // Renamed for clarity
  const [apiLoadStatus, setApiLoadStatus] = useState<'initial' | 'loading' | 'loaded' | 'error' | 'no_key'>('initial');

  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_SCRIPT_ID,
    googleMapsApiKey: googleMapsApiKey || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const citySearchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const placeChangedListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  const form = useForm<CityFormData>({
    resolver: zodResolver(cityFormSchema),
    defaultValues: defaultNewCityValues
  });

  useEffect(() => {
    console.log("AddCityDialog: Hook 'isLoaded' cambió:", isLoaded, "Hook 'loadError':", loadError, "API Key provided:", !!googleMapsApiKey);
    if (!googleMapsApiKey) {
      setApiLoadStatus('no_key');
      console.warn("AddCityDialog: Google Maps API Key no proporcionada.");
      return;
    }
    if (apiLoadStatus === 'initial' && !isLoaded && !loadError) {
      setApiLoadStatus('loading');
      console.log("AddCityDialog: Google Maps API script cargando...");
    } else if (isLoaded) {
      setApiLoadStatus('loaded');
      console.log("AddCityDialog: Google Maps API script cargado exitosamente vía useJsApiLoader.");
    } else if (loadError) {
      setApiLoadStatus('error');
      console.error("AddCityDialog: Error al cargar Google Maps API vía useJsApiLoader:", loadError);
    }
  }, [isLoaded, loadError, googleMapsApiKey, apiLoadStatus]);

  const handlePlaceSelected = useCallback(() => {
    console.log("AddCityDialog: handlePlaceSelected - EVENTO 'place_changed' DISPARADO");

    setTimeout(() => {
      console.log("AddCityDialog: handlePlaceSelected (dentro de setTimeout) - INTENTANDO OBTENER LUGAR");
      if (!autocompleteRef.current) {
        console.error("AddCityDialog: Instancia de Autocomplete no encontrada en handlePlaceSelected (setTimeout).");
        return;
      }
      
      const place = autocompleteRef.current.getPlace();
      
      console.log("AddCityDialog: Objeto 'place' crudo obtenido de Google (dentro de setTimeout):", place ? JSON.parse(JSON.stringify(place)) : "NULO O INDEFINIDO");

      if (!place || !place.geometry || !place.geometry.location) {
        toast({ variant: "destructive", title: "Selección Inválida", description: "No se pudieron obtener datos completos del lugar. Inténtalo de nuevo. Revisa la consola para ver el objeto 'place'." });
        console.warn("AddCityDialog: Datos del lugar incompletos o no disponibles. Objeto 'place':", place);
        return;
      }

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      let cityName = '';
      let countryName = '';
      let adminAreaLevel1Name = '';

      if (place.address_components) {
        console.log("AddCityDialog: Extrayendo de address_components:", place.address_components);
        for (const component of place.address_components) {
          if (component.types.includes('locality')) {
            cityName = component.long_name;
            console.log(`AddCityDialog: Ciudad encontrada (locality): ${cityName}`);
          }
          if (component.types.includes('administrative_area_level_1') && !cityName) { // Use AAL1 only if locality not found
            adminAreaLevel1Name = component.long_name;
            console.log(`AddCityDialog: Encontrado admin_area_level_1: ${adminAreaLevel1Name}`);
          }
          if (component.types.includes('country')) {
            countryName = component.long_name;
            console.log(`AddCityDialog: País encontrado: ${countryName}`);
          }
        }
      } else {
        console.warn("AddCityDialog: place.address_components está indefinido. Objeto 'place' crudo:", place);
      }
      
      if (!cityName && adminAreaLevel1Name) {
        cityName = adminAreaLevel1Name;
        console.log(`AddCityDialog: Usando admin_area_level_1 como ciudad: ${cityName}`);
      }
      // Fallback to place.name only if really necessary and it doesn't look like a specific address/business
      if (!cityName && place.name && !place.types?.some(t => ['street_address', 'premise', 'route', 'establishment', 'point_of_interest', 'airport', 'bus_station', 'train_station', 'postal_code', 'sublocality', 'plus_code'].includes(t))) {
        cityName = place.name;
        console.log(`AddCityDialog: Usando place.name como ciudad (fallback): ${cityName}`);
      }

      console.log(`AddCityDialog: Extraído finalmente - Ciudad: "${cityName}", País: "${countryName}", Lat: ${lat}, Lng: ${lng}`);

      if (cityName && countryName && typeof lat === 'number' && typeof lng === 'number') {
        form.setValue('name', cityName, { shouldValidate: true, shouldDirty: true });
        form.setValue('country', countryName, { shouldValidate: true, shouldDirty: true });
        form.setValue('lat', lat, { shouldValidate: true, shouldDirty: true });
        form.setValue('lng', lng, { shouldValidate: true, shouldDirty: true });
        setPreviewCenter({ lat, lng });
        setForceRenderMapKey(prev => prev + 1); // Force map re-render
        if (citySearchInputRef.current) {
          citySearchInputRef.current.value = place.formatted_address || `${cityName}, ${countryName}`;
        }
        toast({ title: "Ciudad Seleccionada", description: `${cityName}, ${countryName} autocompletada.` });
      } else {
        toast({ variant: "destructive", title: "Datos Incompletos", description: "No se pudo extraer toda la información necesaria (ciudad, país) del lugar seleccionado. Revisa los logs." });
        console.error("AddCityDialog: Fallo al extraer todos los datos necesarios del lugar. Extraído:", { cityName, countryName, lat, lng }, "Objeto 'place' original:", place);
      }
    }, 0); 
  }, [form, toast]);

  const initializeAutocomplete = useCallback(() => {
    if (apiLoadStatus !== 'loaded' || !citySearchInputRef.current) {
      console.log("AddCityDialog: Condiciones no cumplidas para inicializar Autocomplete. Estado API:", apiLoadStatus, "Input Ref:", citySearchInputRef.current);
      return;
    }
    if (autocompleteRef.current) {
      console.log("AddCityDialog: Instancia de Autocomplete ya existe. Saltando reinicialización.");
      return;
    }

    console.log("AddCityDialog: Intentando inicializar Google Maps Autocomplete en input:", citySearchInputRef.current);
    try {
      const instance = new window.google.maps.places.Autocomplete(
        citySearchInputRef.current,
        {
          types: ['(cities)'], // Restrict to cities
          fields: ['address_components', 'geometry.location', 'name', 'formatted_address', 'place_id', 'types'], // Request needed fields
        }
      );
      autocompleteRef.current = instance;
      
      // Limpiar listener anterior si existe
      if (placeChangedListenerRef.current) {
        window.google.maps.event.removeListener(placeChangedListenerRef.current);
        console.log("AddCityDialog: Listener 'place_changed' existente eliminado antes de añadir uno nuevo.");
      }
      placeChangedListenerRef.current = instance.addListener('place_changed', handlePlaceSelected);
      console.log("AddCityDialog: Autocomplete inicializado y nuevo listener añadido.");
    } catch (error) {
      console.error("AddCityDialog: Error inicializando Google Maps Autocomplete:", error);
      toast({variant: "destructive", title: "Error de Google Maps", description: `No se pudo inicializar el autocompletado: ${(error as Error).message}`});
    }
  }, [apiLoadStatus, handlePlaceSelected, toast]);

  const cleanupAutocomplete = useCallback(() => {
    console.log("AddCityDialog: Intentando limpiar Autocomplete.");
    if (placeChangedListenerRef.current && window.google?.maps?.event) {
      window.google.maps.event.removeListener(placeChangedListenerRef.current);
      placeChangedListenerRef.current = null;
      console.log("AddCityDialog: Listener 'place_changed' eliminado durante la limpieza.");
    }
    // No limpiar autocompleteRef.current = null aquí directamente,
    // porque podría ser necesario si el diálogo se reabre rápidamente.
    // Se limpia si se desinstancia el componente o explícitamente.
    
    const pacContainers = document.querySelectorAll('.pac-container');
    pacContainers.forEach(container => {
      // Check if the container is still in the body before removing
      if (document.body.contains(container)) container.remove();
    });
    console.log("AddCityDialog: Elementos .pac-container intentaron ser eliminados durante la limpieza.");
  }, []);

  // Effect to manage Autocomplete lifecycle based on dialog state (isOpen)
  useEffect(() => {
    if (isOpen) {
      console.log("AddCityDialog: Dialog abierto. Datos iniciales:", initialData);
      const resetValues = initialData
        ? { ...initialData, notes: initialData.notes || '', lat: initialData.coordinates.lat, lng: initialData.coordinates.lng }
        : { ...defaultNewCityValues, id: undefined }; // Explicitly set id to undefined for new cities
      form.reset(resetValues);

      if (citySearchInputRef.current) {
        citySearchInputRef.current.value = initialData ? `${initialData.name}, ${initialData.country}` : '';
      }
      setPreviewCenter(initialData ? initialData.coordinates : null);
      setForceRenderMapKey(prev => prev + 1); // Ensure map updates with initial data

      // Attempt to initialize if API is loaded and input ref is available
      if (apiLoadStatus === 'loaded' && citySearchInputRef.current && !autocompleteRef.current) {
        console.log("AddCityDialog: [useEffect isOpen] - API cargada, input disponible. Inicializando autocomplete.");
        initializeAutocomplete();
      } else if (apiLoadStatus === 'loaded' && !citySearchInputRef.current) {
         console.warn("AddCityDialog: [useEffect isOpen] - API cargada, pero la referencia al input aún no está disponible.");
      }
    }
    // No se llama cleanupAutocomplete aquí directamente, se maneja en onOpenChange y onFocus
  }, [isOpen, initialData, form, apiLoadStatus, initializeAutocomplete]);

  const handleDialogStateChange = (openState: boolean) => {
    if (!openState) { // Si se está cerrando
        console.log("AddCityDialog: Dialog cambiando a cerrado. Limpiando Autocomplete y reseteando formulario.");
        cleanupAutocomplete(); // Limpia listeners y .pac-container
        autocompleteRef.current = null; // Libera la instancia de Autocomplete
        if (citySearchInputRef.current) citySearchInputRef.current.value = ''; // Limpia el input
        form.reset(defaultNewCityValues); // Resetea el formulario a valores por defecto
        setPreviewCenter(null); // Limpia el mapa de vista previa
    }
    onOpenChange(openState); // Notifica al padre del cambio de estado
  };


  const handleFormSubmit = async (data: CityFormData) => {
    setIsSubmitting(true);
    console.log("AddCityDialog: Formulario enviado con datos:", data);
    
    // Re-check lat/lng before submission, especially if it's a new city
    if (!data.id && (data.lat === 0 && data.lng === 0) && !(form.formState.dirtyFields.lat || form.formState.dirtyFields.lng)) {
        toast({
            variant: "destructive",
            title: "Coordenadas Inválidas",
            description: "Por favor, selecciona una ciudad del buscador para obtener coordenadas válidas.",
        });
        form.setError("name", {type: "manual", message: "Selecciona una ciudad válida del buscador."}); // O en lat/lng
        setIsSubmitting(false);
        return;
    }

    try {
      await onSaveCity(data);
      handleDialogStateChange(false); // Cierra el diálogo después de guardar exitosamente
    } catch (error) {
      console.error("AddCityDialog: Error guardando ciudad:", error);
      // No cerrar el diálogo en caso de error para que el usuario pueda corregir
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
  if (apiLoadStatus === 'loading') {
    searchInputInfo = <p className="text-xs text-muted-foreground flex items-center pt-1"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Cargando API de Google Maps...</p>;
  } else if (apiLoadStatus === 'error') {
    searchInputInfo = <p className="text-xs text-destructive flex items-center pt-1"><AlertTriangle className="h-3 w-3 mr-1" />Error al cargar Google Maps. Revisa tu API Key, los servicios habilitados (Maps JavaScript API & Places API), la facturación en Google Cloud y las restricciones de la clave.</p>;
  } else if (apiLoadStatus === 'no_key') {
    searchInputInfo = <p className="text-xs text-destructive flex items-center pt-1"><AlertTriangle className="h-3 w-3 mr-1" />API Key de Google Maps no configurada en el archivo `.env`.</p>;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogStateChange}>
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
            {/* Campo de Búsqueda de Ciudad */}
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
                    console.log("AddCityDialog: citySearchInput onFocus triggered.");
                    // Intenta limpiar cualquier .pac-container viejo
                    const pacContainers = document.querySelectorAll('.pac-container');
                    if (pacContainers.length > 1) { // Si hay más de uno, el actual es el último
                         console.log("AddCityDialog: Múltiples .pac-container encontrados en focus. Eliminando extras.");
                         pacContainers.forEach((container, index) => {
                            // Conserva el último .pac-container, que es el activo.
                            // Los .pac-container se apilan, el más reciente es el último en el NodeList.
                            if (index < pacContainers.length -1 && document.body.contains(container) ) container.remove();
                         });
                    }
                    if (apiLoadStatus === 'loaded' && citySearchInputRef.current && !autocompleteRef.current) {
                        console.log("AddCityDialog: [onFocus] - Inicializando Autocomplete porque no existía.");
                        initializeAutocomplete();
                    } else {
                        console.log("AddCityDialog: [onFocus] - Condiciones no cumplidas o Autocomplete ya inicializado. Estado API:", apiLoadStatus, "Input Ref:", citySearchInputRef.current, "Autocomplete Inst:", autocompleteRef.current);
                    }
                }}
              />
              {searchInputInfo}
            </div>
            
            {/* Campos autocompletados */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><MapPinIconLucide className="mr-2 h-4 w-4 text-muted-foreground" />Nombre Ciudad</FormLabel>
                  <FormControl>
                    <Input placeholder="Se autocompletará al buscar" {...field} readOnly={!form.formState.dirtyFields.name}/>
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
                    <Input placeholder="Se autocompletará al buscar" {...field} readOnly={!form.formState.dirtyFields.country} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Campos ocultos para lat/lng, validados */}
            <FormField control={form.control} name="lat" render={({ field }) => <Input type="hidden" {...field} />} />
            <FormField control={form.control} name="lng" render={({ field }) => <Input type="hidden" {...field} />} />
            { (form.formState.errors.lat || form.formState.errors.lng) && 
              (form.getValues('lat') === 0 && form.getValues('lng') === 0 && !initialData) && // Muestra solo si es nueva ciudad y coords son 0,0
                <FormMessage>
                    {form.formState.errors.lat?.message || form.formState.errors.lng?.message || "Latitud y longitud son necesarias. Usa el buscador."}
                </FormMessage>
            }

            {/* Mapa de Vista Previa */}
            {apiLoadStatus === 'loaded' && previewCenter && (
              <div className="mt-4">
                <FormLabel>Vista Previa del Mapa</FormLabel>
                <div className="mt-1 h-[200px] w-full rounded-md overflow-hidden border">
                  <GoogleMap
                    key={`preview-map-${previewCenter.lat}-${previewCenter.lng}-${forceRenderMapKey}`} // Key para forzar re-render si cambia
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

            {/* Fechas */}
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

            {/* Notas */}
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
                <Button type="button" variant="outline" >Cancelar</Button>
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
