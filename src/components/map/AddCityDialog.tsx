
"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input as ShadcnInput } from '@/components/ui/input'; // Renamed to avoid conflict
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
import { useJsApiLoader, GoogleMap, MarkerF } from '@react-google-maps/api';
import { useToast } from "@/hooks/use-toast";
import type { City, Coordinates } from '@/lib/types';

// TypeScript declaration for the Google Maps Web Component
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'gmp-place-autocomplete-element': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        ref?: React.Ref<HTMLElement & { value?: string; place?: google.maps.places.PlaceResult }>;
        placeholder?: string;
        "request-options"?: string;
        "value"?: string; // Allow direct value attribute
      }, HTMLElement>;
    }
  }
}

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
  googleMapsApiKeyFromEnv: string; // Renamed to be clear it comes from env
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
  departureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
  notes: '',
  lat: 0, // Placeholder, should be updated by autocomplete
  lng: 0, // Placeholder, should be updated by autocomplete
};

const GOOGLE_MAPS_LIBRARIES = ['places'] as Array<'places'>;
const GOOGLE_MAPS_SCRIPT_ID = 'app-google-maps-script'; // Consistent script ID

export default function AddCityDialog({
  isOpen,
  onOpenChange,
  onSaveCity,
  googleMapsApiKeyFromEnv,
  initialData,
}: AddCityDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewCenter, setPreviewCenter] = useState<Coordinates | null>(null);
  const [forceRenderMapKey, setForceRenderMapKey] = useState(0); // To force map re-render
  const [apiLoadStatus, setApiLoadStatus] = useState<'initial' | 'loading' | 'loaded' | 'error' | 'no_key'>('initial');
  
  const placeAutocompleteElementRef = useRef<HTMLElement & { value?: string; place?: google.maps.places.PlaceResult }>(null);
  const placeChangeListenerRef = useRef<((event: CustomEvent<{ place: google.maps.places.PlaceResult }>) => Promise<void>) | null>(null);

  const effectiveApiKey = googleMapsApiKeyFromEnv || "";

  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_SCRIPT_ID,
    googleMapsApiKey: effectiveApiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
    preventGoogleFontsLoading: true, // Consistent with MapDisplay
  });

  const form = useForm<CityFormData>({
    resolver: zodResolver(cityFormSchema),
    defaultValues: defaultNewCityValues,
  });

  useEffect(() => {
    if (!effectiveApiKey) {
      setApiLoadStatus('no_key');
      console.warn("AddCityDialog: Google Maps API Key NO está configurada (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).");
    } else if (loadError) {
      setApiLoadStatus('error');
      console.error("AddCityDialog: ERROR al cargar Google Maps API:", loadError);
    } else if (isLoaded) {
      setApiLoadStatus('loaded');
      console.log("AddCityDialog: Google Maps API script CARGADO exitosamente.");
    } else {
      setApiLoadStatus('loading');
      console.log("AddCityDialog: Google Maps API script CARGANDO o en estado inicial...");
    }
  }, [isLoaded, loadError, effectiveApiKey]);

  const handleGmpPlaceChange = useCallback(async (event: CustomEvent<{ place: google.maps.places.PlaceResult }>) => {
    console.log("AddCityDialog: Evento 'gmp-placechange' DISPARADO.");
    const placeResultFromEvent = event.detail?.place;

    if (!placeResultFromEvent) {
      console.warn("AddCityDialog: Evento 'gmp-placechange' no contenía detalles del lugar (place).");
      toast({ variant: "destructive", title: "Selección Vacía", description: "No se pudo obtener información del lugar seleccionado." });
      return;
    }
    
    console.log("AddCityDialog: Objeto 'place' crudo (antes de fetchFields) desde 'gmp-placechange':", placeResultFromEvent ? JSON.parse(JSON.stringify(placeResultFromEvent)) : "NULO O INDEFINIDO");

    try {
      await placeResultFromEvent.fetchFields({
        fields: ['displayName', 'formattedAddress', 'geometry', 'addressComponents', 'name', 'types'],
      });
      
      const fetchedPlaceForLogging = placeResultFromEvent ? JSON.parse(JSON.stringify(placeResultFromEvent)) : null;
      console.log("AddCityDialog: Objeto 'place' DESPUÉS de fetchFields:", fetchedPlaceForLogging);

      const lat = placeResultFromEvent.geometry?.location?.lat();
      const lng = placeResultFromEvent.geometry?.location?.lng();
      
      let extractedCityName = '';
      let extractedCountryName = '';

      if (placeResultFromEvent.addressComponents) {
        for (const component of placeResultFromEvent.addressComponents) {
          if (component.types.includes('locality')) {
            extractedCityName = component.longText || component.shortText || '';
          } else if (component.types.includes('administrative_area_level_1') && !extractedCityName) {
             if (!placeResultFromEvent.addressComponents.some(c => c.types.includes('locality'))) { // Prefer locality if present
                extractedCityName = component.longText || component.shortText || '';
             }
          }
          if (component.types.includes('country')) {
            extractedCountryName = component.longText || component.shortText || '';
          }
        }
      }
      
      // Fallback to displayName if city name couldn't be extracted reliably
      if (!extractedCityName && placeResultFromEvent.displayName) {
        extractedCityName = placeResultFromEvent.displayName;
        // Attempt to clean country from displayName if country was found
        if (extractedCountryName && extractedCityName.includes(extractedCountryName)) {
            extractedCityName = extractedCityName.replace(`, ${extractedCountryName}`, '').replace(extractedCountryName, '').trim();
        }
      }
      // Final fallback for city if it's a type of locality from the main place name
      if (!extractedCityName && placeResultFromEvent.name && placeResultFromEvent.types?.includes('locality')) {
          extractedCityName = placeResultFromEvent.name;
      }


      console.log(`AddCityDialog: Extraído finalmente - Ciudad: "${extractedCityName}", País: "${extractedCountryName}", Lat: ${lat}, Lng: ${lng}`);

      if (extractedCityName && typeof lat === 'number' && typeof lng === 'number') {
        form.setValue('name', extractedCityName, { shouldValidate: true, shouldDirty: true });
        // Only set country if extracted, otherwise, user might need to input it.
        if (extractedCountryName) {
            form.setValue('country', extractedCountryName, { shouldValidate: true, shouldDirty: true });
        } else {
            form.setValue('country', '', { shouldValidate: true, shouldDirty: true }); // Clear if not found
            console.warn("AddCityDialog: País no encontrado en addressComponents.");
        }
        form.setValue('lat', lat, { shouldValidate: true, shouldDirty: true });
        form.setValue('lng', lng, { shouldValidate: true, shouldDirty: true });
        setPreviewCenter({ lat, lng });
        setForceRenderMapKey(prev => prev + 1);
        
        if (placeAutocompleteElementRef.current && placeResultFromEvent.formattedAddress) {
             placeAutocompleteElementRef.current.value = placeResultFromEvent.formattedAddress;
        }
        toast({ title: "Ciudad Seleccionada", description: `${extractedCityName}${extractedCountryName ? ', ' + extractedCountryName : ''} autocompletada.` });
      } else {
        toast({ variant: "destructive", title: "Datos Incompletos", description: "No se pudo extraer toda la información necesaria del lugar. Revisa la consola." });
        console.error("AddCityDialog: Fallo al extraer todos los datos del lugar. Extraído:", { extractedCityName, extractedCountryName, lat, lng });
      }
    } catch (error) {
      console.error("AddCityDialog: Error en fetchFields o procesamiento posterior:", error);
      toast({ variant: "destructive", title: "Error de Google Maps", description: `No se pudo obtener detalles del lugar: ${(error as Error).message}` });
    }
  }, [form, toast, setPreviewCenter]);


  useEffect(() => {
    const autocompleteElement = placeAutocompleteElementRef.current;
    placeChangeListenerRef.current = handleGmpPlaceChange; // Store the current version

    if (isOpen && autocompleteElement && apiLoadStatus === 'loaded') {
      const eventListenerCallback = (event: Event) => {
        if (placeChangeListenerRef.current) {
          placeChangeListenerRef.current(event as CustomEvent<{ place: google.maps.places.PlaceResult }>);
        }
      };
      
      console.log("AddCityDialog: Adjuntando listener 'gmp-placechange' a:", autocompleteElement);
      autocompleteElement.addEventListener('gmp-placechange', eventListenerCallback);

      return () => {
        if (autocompleteElement) {
          console.log("AddCityDialog: Limpiando listener 'gmp-placechange' de:", autocompleteElement);
          autocompleteElement.removeEventListener('gmp-placechange', eventListenerCallback);
        }
      };
    }
  }, [isOpen, apiLoadStatus, handleGmpPlaceChange]);


  useEffect(() => {
    console.log(`AddCityDialog: useEffect [isOpen] - Dialog ${isOpen ? 'ABIERTO' : 'CERRADO'}. API Status: ${apiLoadStatus}`);
    if (isOpen) {
      const resetValues = initialData
        ? { ...initialData, notes: initialData.notes || '', lat: initialData.coordinates.lat, lng: initialData.coordinates.lng, id: initialData.id }
        : { ...defaultNewCityValues, id: undefined };
      
      console.log("AddCityDialog: [useEffect isOpen=true] - Formulario reseteado con:", resetValues);
      form.reset(resetValues);
      setPreviewCenter(initialData ? initialData.coordinates : null);
      
      // This will set the value attribute on the gmp-place-autocomplete-element when it renders
      // No need for imperative setting here if the `value` attribute in JSX is correctly bound
      
      setForceRenderMapKey(prev => prev + 1);

    } else {
      // Form is reset via onOpenChange when dialog truly closes
    }
  }, [isOpen, initialData, form, apiLoadStatus]);


  const handleDialogStateChange = (openState: boolean) => {
    console.log(`AddCityDialog: handleDialogStateChange - Cambiando estado a: ${openState ? 'ABIERTO' : 'CERRADO'}`);
    if (!openState) {
      console.log("AddCityDialog: Dialog se está CERRANDO. Limpiando formulario, preview y valor del buscador.");
      if (placeAutocompleteElementRef.current) {
        placeAutocompleteElementRef.current.value = ''; // Clear search field on close
      }
      form.reset(defaultNewCityValues);
      setPreviewCenter(null);
    }
    onOpenChange(openState);
  };

  const handleFormSubmit = async (data: CityFormData) => {
    setIsSubmitting(true);
    console.log("AddCityDialog: Formulario ENVIADO con datos:", data);
    if ( (data.lat === 0 && data.lng === 0) && !(form.formState.dirtyFields.lat || form.formState.dirtyFields.lng || (initialData && (initialData.coordinates.lat !== 0 || initialData.coordinates.lng !== 0))) ) {
      toast({ variant: "destructive", title: "Coordenadas Inválidas", description: "Selecciona una ciudad del buscador para obtener coordenadas válidas." });
      form.setError("name", { type: "manual", message: "Selecciona una ciudad válida del buscador." });
      setIsSubmitting(false);
      return;
    }
    try {
      await onSaveCity(data);
      handleDialogStateChange(false); // Close dialog on successful save
    } catch (error) {
      console.error("AddCityDialog: Error guardando ciudad:", error);
      // Toast is handled by the caller or can be added here too
    } finally {
      setIsSubmitting(false);
    }
  };

  const dialogTitle = initialData ? "Editar Ciudad" : "Añadir Nueva Ciudad";
  const dialogDescription = initialData
    ? "Modifica los detalles de la ciudad. Si cambias la ciudad, usa el buscador."
    : "Busca una ciudad para autocompletar los datos. Luego, completa las fechas de tu estancia.";
  const submitButtonText = initialData ? "Guardar Cambios" : "Añadir Ciudad";
  const FormIcon = initialData ? Edit3 : PlusCircle;

  // Memoize requestOptions to prevent re-creating it on every render
  const requestOptions = useMemo(() => JSON.stringify({
    fields: ["addressComponents", "geometry.location", "name", "formattedAddress", "displayName", "types"],
    includedPrimaryTypes: ["locality", "administrative_area_level_1", "postal_town", "sublocality_level_1"],
    // componentRestrictions: { country: ['ES'] } // Example: Restrict to Spain
  }), []);

  console.log("AddCityDialog: Renderizando. apiLoadStatus:", apiLoadStatus);

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
            
            {apiLoadStatus === 'loading' && (
              <div className="text-sm text-muted-foreground flex items-center p-3 border rounded-md bg-muted/50">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />Cargando API de Google Maps...
              </div>
            )}
            {apiLoadStatus === 'error' && (
              <div className="text-sm text-destructive flex items-center p-3 border border-destructive rounded-md bg-destructive/10">
                <AlertTriangle className="h-4 w-4 mr-2" />Error al cargar Google Maps. Revisa tu API Key y la consola.
              </div>
            )}
            {apiLoadStatus === 'no_key' && (
              <div className="text-sm text-destructive flex items-center p-3 border border-destructive rounded-md bg-destructive/10">
                <AlertTriangle className="h-4 w-4 mr-2" />API Key de Google Maps no configurada. El buscador de ciudades no funcionará.
              </div>
            )}

            {apiLoadStatus === 'loaded' && (
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
                  value={isOpen && initialData ? `${initialData.name}, ${initialData.country}` : undefined}
                >
                </gmp-place-autocomplete-element>
                 <FormMessage>{form.formState.errors.name?.message || form.formState.errors.country?.message}</FormMessage>
              </div>
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><MapPinIconLucide className="mr-2 h-4 w-4 text-muted-foreground" />Nombre Ciudad</FormLabel>
                  <FormControl>
                    <ShadcnInput placeholder="Se autocompletará al buscar" {...field} readOnly={!form.formState.dirtyFields.name && !!initialData && !!field.value} />
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
                    <ShadcnInput placeholder="Se autocompletará al buscar" {...field} readOnly={!form.formState.dirtyFields.country && !!initialData && !!field.value} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Hidden fields for lat/lng, errors shown below if any */}
            <FormField control={form.control} name="lat" render={({ field }) => <ShadcnInput type="hidden" {...field} />} />
            <FormField control={form.control} name="lng" render={({ field }) => <ShadcnInput type="hidden" {...field} />} />
            {(form.formState.errors.lat || form.formState.errors.lng) &&
              (form.getValues('lat') === 0 && form.getValues('lng') === 0 && !initialData) && // Show only if default 0,0 and not editing
              <FormMessage className="text-xs">
                {form.formState.errors.lat?.message || form.formState.errors.lng?.message || "Latitud y longitud son necesarias. Usa el buscador."}
              </FormMessage>
            }

            {apiLoadStatus === 'loaded' && previewCenter && (
              <div className="mt-3">
                <Label className="text-sm font-medium">Vista Previa del Mapa</Label>
                <div className="mt-1 h-[200px] w-full rounded-md overflow-hidden border">
                  <GoogleMap
                    key={`preview-map-${previewCenter.lat}-${previewCenter.lng}-${forceRenderMapKey}`} // Force re-render on center change
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
              <FormField
                control={form.control}
                name="arrivalDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />Llegada</FormLabel>
                    <FormControl>
                      <ShadcnInput type="date" {...field} className="text-sm" />
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
                      <ShadcnInput type="date" {...field} className="text-sm" />
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
                    <Textarea placeholder="Información adicional sobre esta ciudad..." {...field} className="text-sm" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4 sticky bottom-0 bg-background pb-2">
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
