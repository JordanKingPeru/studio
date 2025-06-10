
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input as ShadcnInput } from '@/components/ui/input'; // Renombrado para evitar colisión
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
import { GoogleMap, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { useToast } from "@/hooks/use-toast";
import type { City, Coordinates } from '@/lib/types';

// Declaración para que TypeScript entienda el Web Component de Google
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'gmp-place-autocomplete-element': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        ref?: React.Ref<HTMLElement & { value?: string; place?: google.maps.places.PlaceResult }>;
        placeholder?: string;
        "request-options"?: string;
        "value"?: string; // Para pre-llenado
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
  googleMapsApiKey: string;
  initialData?: City | null;
}

const mapContainerStyle = {
  width: '100%',
  height: '200px',
  borderRadius: '0.375rem', // Tailwind's rounded-md
};

const defaultNewCityValues: Omit<CityFormData, 'id'> = {
  name: '',
  country: '',
  arrivalDate: new Date().toISOString().split('T')[0],
  departureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 7 days later
  notes: '',
  lat: 0, // Default to 0,0; will be updated by autocomplete
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
  const [forceRenderMapKey, setForceRenderMapKey] = useState(0); // To force re-render of GoogleMap component
  const [apiLoadStatus, setApiLoadStatus] = useState<'initial' | 'loading' | 'loaded' | 'error' | 'no_key'>('initial');

  const placeAutocompleteElementRef = useRef<HTMLElement & { value?: string; place?: google.maps.places.PlaceResult }>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_SCRIPT_ID,
    googleMapsApiKey: googleMapsApiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
    preventGoogleFontsLoading: true, // Added for consistency
  });

  const form = useForm<CityFormData>({
    resolver: zodResolver(cityFormSchema),
    defaultValues: defaultNewCityValues
  });

  useEffect(() => {
    console.log("AddCityDialog: Hook 'isLoaded' (Google API) cambió:", isLoaded, "Hook 'loadError':", loadError, "API Key proporcionada:", !!googleMapsApiKey);
    if (!googleMapsApiKey) {
      setApiLoadStatus('no_key');
      console.warn("AddCityDialog: Google Maps API Key NO proporcionada.");
      return;
    }

    if (apiLoadStatus === 'initial' && !isLoaded && !loadError) {
      setApiLoadStatus('loading');
      console.log("AddCityDialog: Google Maps API script CARGANDO...");
    } else if (isLoaded) {
      setApiLoadStatus('loaded');
      console.log("AddCityDialog: Google Maps API script CARGADO exitosamente.");
    } else if (loadError) {
      setApiLoadStatus('error');
      console.error("AddCityDialog: ERROR al cargar Google Maps API:", loadError);
    }
  }, [isLoaded, loadError, googleMapsApiKey, apiLoadStatus]);

  // Effect to handle dialog open/close and form pre-filling
  useEffect(() => {
    console.log(`AddCityDialog: useEffect [isOpen] - Dialog ${isOpen ? 'ABIERTO' : 'CERRADO'}. API Status: ${apiLoadStatus}, InitialData:`, initialData ? initialData.name : 'Ninguno');
    if (isOpen) {
      const resetValues = initialData
        ? { ...initialData, notes: initialData.notes || '', lat: initialData.coordinates.lat, lng: initialData.coordinates.lng }
        : { ...defaultNewCityValues, id: undefined }; // Ensure id is undefined for new cities
      form.reset(resetValues);
      console.log("AddCityDialog: [useEffect isOpen=true] - Formulario reseteado con:", resetValues);

      setPreviewCenter(initialData ? initialData.coordinates : null);
      setForceRenderMapKey(prev => prev + 1); // Force re-render map preview

      // Pre-fill PlaceAutocompleteElement if initialData exists and element is available
      if (initialData && placeAutocompleteElementRef.current) {
        placeAutocompleteElementRef.current.value = `${initialData.name}, ${initialData.country}`;
        console.log("AddCityDialog: [useEffect isOpen=true] - PlaceAutocompleteElement pre-llenado con:", placeAutocompleteElementRef.current.value);
      } else if (!initialData && placeAutocompleteElementRef.current) {
        placeAutocompleteElementRef.current.value = ''; // Clear for new city
        console.log("AddCityDialog: [useEffect isOpen=true] - PlaceAutocompleteElement limpiado para nueva ciudad.");
      }

    }
  }, [isOpen, initialData, form, apiLoadStatus]); // `placeAutocompleteElementRef.current` is not a stable dependency here.

  // Effect to attach and clean up 'gmp-placechange' listener
  useEffect(() => {
    const autocompleteElement = placeAutocompleteElementRef.current;

    if (isOpen && autocompleteElement && apiLoadStatus === 'loaded') {
      const handleGmpPlaceChange = async (event: Event) => {
        console.log("AddCityDialog: Evento 'gmp-placechange' DISPARADO.");
        const customEvent = event as CustomEvent<{ place: google.maps.places.PlaceResult }>;
        const place = customEvent.detail?.place;

        if (!place) {
          console.warn("AddCityDialog: Evento 'gmp-placechange' no contenía detalles del lugar (place).");
          return;
        }
        console.log("AddCityDialog: Objeto 'place' crudo (antes de fetchFields) desde 'gmp-placechange':", place ? JSON.parse(JSON.stringify(place)) : "NULO O INDEFINIDO");

        try {
          const fieldsToFetch: (keyof google.maps.places.PlaceResult)[] = ['displayName', 'formattedAddress', 'geometry', 'addressComponents', 'name', 'types'];
          await place.fetchFields({ fields: fieldsToFetch });
          console.log("AddCityDialog: Objeto 'place' DESPUÉS de fetchFields:", place ? JSON.parse(JSON.stringify(place)) : "NULO O INDEFINIDO");

          const lat = place.geometry?.location?.lat();
          const lng = place.geometry?.location?.lng();
          
          let extractedCityName = '';
          let extractedCountryName = '';

          if (place.addressComponents) {
            console.log("AddCityDialog: Extrayendo de addressComponents:", JSON.parse(JSON.stringify(place.addressComponents)));
            for (const component of place.addressComponents) {
              if (component.types.includes('locality')) {
                extractedCityName = component.longText || component.shortText || '';
              } else if (component.types.includes('administrative_area_level_1') && !extractedCityName) {
                 if (!place.addressComponents.some(c => c.types.includes('locality'))) {
                    extractedCityName = component.longText || component.shortText || '';
                 }
              }
              if (component.types.includes('country')) {
                extractedCountryName = component.longText || component.shortText || '';
              }
            }
          }
          
          if (!extractedCityName && place.displayName) {
            extractedCityName = place.displayName;
            if (extractedCountryName && extractedCityName.includes(extractedCountryName)) {
                extractedCityName = extractedCityName.replace(`, ${extractedCountryName}`, '').replace(extractedCountryName, '').trim();
            }
          }

          console.log(`AddCityDialog: Extraído finalmente - Ciudad: "${extractedCityName}", País: "${extractedCountryName}", Lat: ${lat}, Lng: ${lng}`);

          if (extractedCityName && extractedCountryName && typeof lat === 'number' && typeof lng === 'number') {
            form.setValue('name', extractedCityName, { shouldValidate: true, shouldDirty: true });
            form.setValue('country', extractedCountryName, { shouldValidate: true, shouldDirty: true });
            form.setValue('lat', lat, { shouldValidate: true, shouldDirty: true });
            form.setValue('lng', lng, { shouldValidate: true, shouldDirty: true });
            setPreviewCenter({ lat, lng });
            setForceRenderMapKey(prev => prev + 1); // Re-render map
            
            if (placeAutocompleteElementRef.current && place.formattedAddress) {
                 placeAutocompleteElementRef.current.value = place.formattedAddress; // Update displayed value
            }
            toast({ title: "Ciudad Seleccionada", description: `${extractedCityName}, ${extractedCountryName} autocompletada.` });
          } else {
            toast({ variant: "destructive", title: "Datos Incompletos", description: "No se pudo extraer toda la información necesaria del lugar seleccionado." });
            console.error("AddCityDialog: Fallo al extraer todos los datos del lugar. Extraído:", { extractedCityName, extractedCountryName, lat, lng });
          }

        } catch (error) {
          console.error("AddCityDialog: Error al obtener detalles del lugar (fetchFields):", error);
          toast({ variant: "destructive", title: "Error de Google Maps", description: `No se pudo obtener detalles del lugar: ${(error as Error).message}` });
        }
      };

      console.log("AddCityDialog: Adjuntando listener 'gmp-placechange' a <gmp-place-autocomplete-element>.");
      autocompleteElement.addEventListener('gmp-placechange', handleGmpPlaceChange);

      return () => {
        if (autocompleteElement) {
          console.log("AddCityDialog: Limpiando listener 'gmp-placechange' de <gmp-place-autocomplete-element>.");
          autocompleteElement.removeEventListener('gmp-placechange', handleGmpPlaceChange);
        }
      };
    }
  }, [isOpen, apiLoadStatus, form, toast]);


  const handleDialogStateChange = (openState: boolean) => {
    console.log(`AddCityDialog: handleDialogStateChange - Cambiando estado a: ${openState ? 'ABIERTO' : 'CERRADO'}`);
    if (!openState) {
      console.log("AddCityDialog: Dialog se está CERRANDO. Reseteando formulario y preview.");
      form.reset(defaultNewCityValues);
      setPreviewCenter(null);
      if (placeAutocompleteElementRef.current) {
        placeAutocompleteElementRef.current.value = '';
      }
    }
    onOpenChange(openState);
  };

  const handleFormSubmit = async (data: CityFormData) => {
    setIsSubmitting(true);
    console.log("AddCityDialog: Formulario ENVIADO con datos:", data);
    if (!data.id && (data.lat === 0 && data.lng === 0) && !(form.formState.dirtyFields.lat || form.formState.dirtyFields.lng)) {
      toast({
        variant: "destructive",
        title: "Coordenadas Inválidas",
        description: "Por favor, selecciona una ciudad del buscador para obtener coordenadas válidas.",
      });
      form.setError("name", { type: "manual", message: "Selecciona una ciudad válida del buscador." }); // Or set error on lat/lng
      setIsSubmitting(false);
      return;
    }
    try {
      await onSaveCity(data);
      handleDialogStateChange(false); // Cerrar y limpiar después de guardar
    } catch (error) {
      console.error("AddCityDialog: Error guardando ciudad:", error);
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

  // Refined request-options for PlaceAutocompleteElement
  const requestOptions = JSON.stringify({
    fields: ["addressComponents", "geometry.location", "name", "formattedAddress", "displayName", "types"],
    includedPrimaryTypes: ["locality", "administrative_area_level_1", "postal_town", "sublocality_level_1"],
    componentRestrictions: { country: [] } // No country restrictions by default
  });

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
                  value={initialData ? `${initialData.name}, ${initialData.country}` : ""}
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
                    <ShadcnInput placeholder="Se autocompletará al buscar" {...field} readOnly={!form.formState.dirtyFields.name} />
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
                    <ShadcnInput placeholder="Se autocompletará al buscar" {...field} readOnly={!form.formState.dirtyFields.country} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Hidden fields for lat/lng, form.setError will show messages under 'name' or general form error */}
            <FormField control={form.control} name="lat" render={({ field }) => <ShadcnInput type="hidden" {...field} />} />
            <FormField control={form.control} name="lng" render={({ field }) => <ShadcnInput type="hidden" {...field} />} />
            {(form.formState.errors.lat || form.formState.errors.lng) &&
              (form.getValues('lat') === 0 && form.getValues('lng') === 0 && !initialData) &&
              <FormMessage className="text-xs">
                {form.formState.errors.lat?.message || form.formState.errors.lng?.message || "Latitud y longitud son necesarias. Usa el buscador."}
              </FormMessage>
            }

            {apiLoadStatus === 'loaded' && previewCenter && (
              <div className="mt-3">
                <Label className="text-sm font-medium">Vista Previa del Mapa</Label>
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

            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => handleDialogStateChange(false)}>Cancelar</Button>
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

