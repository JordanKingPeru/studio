
"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { TripDetails, City, Coordinates } from '@/lib/types';
import SectionCard from '@/components/ui/SectionCard';
import { MapPin, Route, PlusCircle, Trash2, CalendarIcon, Globe, StickyNote, Loader2, AlertTriangle, Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription as DialogFormDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useJsApiLoader, GoogleMap, MarkerF } from '@react-google-maps/api';
import { useToast } from "@/hooks/use-toast";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

interface MapSectionProps {
  tripData: TripDetails;
  cities: City[];
  onAddCity: (cityData: Omit<City, 'id' | 'coordinates'> & { coordinates: Coordinates }) => Promise<void>;
  onDeleteCity: (cityId: string) => Promise<void>;
}

const cityFormSchema = z.object({
  name: z.string().min(1, "El nombre de la ciudad es obligatorio."),
  country: z.string().min(1, "El país es obligatorio."),
  arrivalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  notes: z.string().optional(),
  lat: z.number({ required_error: "La latitud es necesaria. Selecciona una ciudad del buscador."}),
  lng: z.number({ required_error: "La longitud es necesaria. Selecciona una ciudad del buscador."}),
}).refine(data => {
    if (data.arrivalDate && data.departureDate) {
        return parseISO(data.departureDate) >= parseISO(data.arrivalDate);
    }
    return true;
}, {
    message: "La fecha de salida debe ser posterior o igual a la fecha de llegada.",
    path: ["departureDate"],
});

type CityFormData = z.infer<typeof cityFormSchema>;

const libraries: ("places")[] = ["places"];

export default function MapSection({ tripData, cities, onAddCity, onDeleteCity }: MapSectionProps) {
  const [isCityFormOpen, setIsCityFormOpen] = useState(false);
  const [previewCenter, setPreviewCenter] = useState<Coordinates | null>(null);
  const [forceRenderKey, setForceRenderKey] = useState(0); // Used to force re-render of RHF fields
  const { toast } = useToast();

  const [autocompleteNode, setAutocompleteNode] = useState<HTMLElement | null>(null);

  const placeAutocompleteRefCallback = useCallback((node: HTMLElement | null) => {
    console.log("MapSection DEBUG: placeAutocompleteRefCallback called with node:", node);
    if (node && (node as any).value) { // Clear previous value if node is being reused
        (node as any).value = "";
    }
    setAutocompleteNode(node);
  }, []);


  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
    language: 'es',
  });

  const form = useForm<CityFormData>({
    resolver: zodResolver(cityFormSchema),
    defaultValues: {
      name: '',
      country: '',
      arrivalDate: new Date().toISOString().split('T')[0],
      departureDate: new Date().toISOString().split('T')[0],
      notes: '',
      lat: undefined,
      lng: undefined,
    },
  });

  const handlePlaceSelectedCallback = useCallback((event: Event) => {
    console.log("MapSection DEBUG: gmp-placechange event FIRED.");
    const place = (event.target as any)?.place as google.maps.places.PlaceResult | undefined;

    if (place && typeof place === 'object') {
        console.log("MapSection DEBUG: Raw place data from event:", JSON.stringify(place));
        
        let finalCityName = place.displayName || "";
        let extractedCountryName = "";
        let latitude: number | undefined;
        let longitude: number | undefined;

        if (place.addressComponents) {
            const countryComponent = place.addressComponents.find(c => c.types.includes('country'));
            if (countryComponent) {
                extractedCountryName = countryComponent.longText || countryComponent.shortText || "";
            }
            // Try to get a more specific city name if displayName is too broad (e.g., just "California")
            const localityComponent = place.addressComponents.find(c => c.types.includes('locality') || c.types.includes('postal_town') || c.types.includes('administrative_area_level_1'));
             if (localityComponent && (!finalCityName || (extractedCountryName && finalCityName.includes(extractedCountryName)) || finalCityName === extractedCountryName ) ) {
                finalCityName = localityComponent.longText || localityComponent.shortText || finalCityName;
             }
        }
        // Fallback for country if not in addressComponents (less reliable)
        if (!extractedCountryName && place.formattedAddress) {
            const parts = place.formattedAddress.split(',');
            if (parts.length > 0) {
                 const potentialCountry = parts[parts.length - 1].trim();
                 // Basic check if it's likely a country (e.g., not a number like a zip code)
                 if (isNaN(parseInt(potentialCountry))) {
                    extractedCountryName = potentialCountry;
                 }
            }
        }
        // Clean up city name if it contains the country
        if (finalCityName && extractedCountryName && finalCityName.includes(extractedCountryName) && finalCityName !== extractedCountryName) {
            finalCityName = finalCityName.replace(`, ${extractedCountryName}`, "").replace(extractedCountryName, "").trim();
        }


        if (place.location) { // location can be LatLng or LatLngLiteral
             if (typeof place.location.lat === 'function' && typeof place.location.lng === 'function') { // LatLng
                latitude = place.location.lat();
                longitude = place.location.lng();
            } else if (typeof (place.location as google.maps.LatLngLiteral).lat === 'number' && typeof (place.location as google.maps.LatLngLiteral).lng === 'number') { // LatLngLiteral
                latitude = (place.location as google.maps.LatLngLiteral).lat;
                longitude = (place.location as google.maps.LatLngLiteral).lng;
            }
        }
        
        console.log(`MapSection DEBUG: Extracted Values - For Form Name: "${finalCityName}", Country: "${extractedCountryName}", Lat: ${latitude}, Lng: ${longitude}`);

        if (finalCityName && extractedCountryName && typeof latitude === 'number' && typeof longitude === 'number') {
            form.setValue('name', finalCityName, { shouldValidate: true, shouldDirty: true });
            form.setValue('country', extractedCountryName, { shouldValidate: true, shouldDirty: true });
            form.setValue('lat', latitude, { shouldValidate: true, shouldDirty: true });
            form.setValue('lng', longitude, { shouldValidate: true, shouldDirty: true });
            setPreviewCenter({ lat: latitude, lng: longitude });
            setForceRenderKey(prev => { // Force RHF fields to update their display
                const newKey = prev + 1;
                console.log(`MapSection DEBUG: Forcing re-render for form update. New key: ${newKey}`);
                return newKey;
            });
            toast({ title: "Ubicación Seleccionada", description: `${finalCityName}, ${extractedCountryName}` });
        } else {
            console.error("MapSection ERROR: Missing essential place data after selection.", { finalCityName, extractedCountryName, latitude, longitude });
            toast({
                variant: "destructive",
                title: "Datos incompletos del lugar",
                description: "No se pudo obtener toda la información. Intenta de nuevo o elige otro."
            });
            setPreviewCenter(null);
        }
    } else {
        console.warn("MapSection WARN: gmp-placechange event fired but 'place' data is missing or not an object on event.target.");
        setPreviewCenter(null);
    }
  }, [form, setPreviewCenter, setForceRenderKey, toast]); // Dependencies for useCallback


  // Effect to add/remove event listener
  useEffect(() => {
    const currentAutocompleteNode = autocompleteNode; // Capture current value for cleanup
    const logContext = { isLoaded, GOOGLE_MAPS_API_KEY_PRESENT: !!GOOGLE_MAPS_API_KEY, loadError: !!loadError, autocompleteNodeExists: !!currentAutocompleteNode, isCityFormOpen };
    
    if (isCityFormOpen && isLoaded && GOOGLE_MAPS_API_KEY && !loadError && currentAutocompleteNode) {
      // Check if listener is already attached to this specific node
      if (!(currentAutocompleteNode as any).__gmpPlaceChangedListenerAttached) {
        console.log("MapSection DEBUG: useEffect - Attaching 'gmp-placechange' listener to:", currentAutocompleteNode);
        currentAutocompleteNode.addEventListener('gmp-placechange', handlePlaceSelectedCallback);
        (currentAutocompleteNode as any).__gmpPlaceChangedListenerAttached = true; // Mark this node
        console.log("MapSection DEBUG: useEffect - ADDED 'gmp-placechange' listener.");
      } else {
        console.log("MapSection DEBUG: useEffect - Listener already considered attached to:", currentAutocompleteNode);
      }
    } else {
        console.log("MapSection DEBUG: useEffect - Conditions NOT MET for attaching listener.", logContext);
    }

    return () => {
      if (currentAutocompleteNode && (currentAutocompleteNode as any).__gmpPlaceChangedListenerAttached) {
        console.log("MapSection DEBUG: useEffect cleanup - Removing 'gmp-placechange' listener from:", currentAutocompleteNode);
        currentAutocompleteNode.removeEventListener('gmp-placechange', handlePlaceSelectedCallback);
        delete (currentAutocompleteNode as any).__gmpPlaceChangedListenerAttached; // Unmark this node
        console.log("MapSection DEBUG: useEffect cleanup - REMOVED 'gmp-placechange' listener.");
      }
    };
  }, [isLoaded, GOOGLE_MAPS_API_KEY, loadError, autocompleteNode, isCityFormOpen, handlePlaceSelectedCallback]); // handlePlaceSelectedCallback is stable due to useCallback


  const handleDialogChange = (open: boolean) => {
    setIsCityFormOpen(open);
    if (open) {
      console.log("MapSection DEBUG: Dialog opening. Resetting form. Current autocomplete node state:", autocompleteNode);
      form.reset({
        name: '',
        country: '',
        arrivalDate: new Date().toISOString().split('T')[0],
        departureDate: new Date().toISOString().split('T')[0],
        notes: '',
        lat: undefined,
        lng: undefined,
      });
      setPreviewCenter(null);
      // The placeAutocompleteRefCallback will be called by React when the element mounts/unmounts.
      // If autocompleteNode is already set from a previous render cycle for the dialog,
      // and it's still the same node instance (which it should be if DialogContent key is stable),
      // try to clear its value directly.
      if (autocompleteNode && (autocompleteNode as any).value) {
         (autocompleteNode as any).value = ""; 
      }
       setForceRenderKey(prev => prev + 1); 
    } else {
        console.log("MapSection DEBUG: Dialog closing.");
        // setAutocompleteNode(null); // Not strictly necessary here, as ref callback handles it.
    }
  };

  const handleAddCitySubmit = async (data: CityFormData) => {
    console.log("MapSection DEBUG: handleAddCitySubmit - Attempting to submit form with data:", data);
    if (typeof data.lat !== 'number' || typeof data.lng !== 'number' || !data.name || !data.country) {
        toast({
            variant: "destructive",
            title: "Faltan Datos Esenciales",
            description: "Asegúrate de seleccionar una ciudad del buscador para autocompletar nombre, país y coordenadas.",
        });
        console.error("MapSection ERROR: Submission failed - critical data missing from form state.", data);
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
        handleDialogChange(false); 
    } catch (error) {
        console.error("Error in onAddCity prop:", error);
        toast({
            variant: "destructive",
            title: "Error al guardar ciudad",
            description: (error as Error).message || "Ocurrió un error desconocido."
        });
    }
  };
  
  const headerActions = (
    <Dialog open={isCityFormOpen} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle size={20} className="mr-2" />
          Añadir Ciudad
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg rounded-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-primary flex items-center">
            <MapPin size={22} className="mr-2" />
            Añadir Nueva Ciudad al Itinerario
          </DialogTitle>
          <DialogFormDescription className="text-sm text-muted-foreground pt-1">
            Busca una ciudad y completa los detalles de tu estancia. Nombre, país y coordenadas se autocompletarán.
          </DialogFormDescription>
        </DialogHeader>
        {!GOOGLE_MAPS_API_KEY && (
          <div className="my-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-center">
            <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-destructive" />
            <p className="text-sm font-semibold text-destructive">API Key de Google Maps no configurada.</p>
            <p className="text-xs text-destructive/80">La búsqueda de ciudades y el mapa no funcionarán. Configura NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.</p>
          </div>
        )}
        {loadError && GOOGLE_MAPS_API_KEY && (
           <div className="my-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-center">
            <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-destructive" />
            <p className="text-sm font-semibold text-destructive">Error al cargar Google Maps API.</p>
            <p className="text-xs text-destructive/80">Verifica tu API Key y la configuración de red.</p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleAddCitySubmit)} className="space-y-4 py-2">
            {/* Google Place Autocomplete Input */}
            <div className="space-y-1">
              <FormLabel className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-muted-foreground" />Buscar Ciudad</FormLabel>
              {isCityFormOpen && isLoaded && GOOGLE_MAPS_API_KEY && !loadError ? (
                React.createElement('gmp-place-autocomplete', {
                  ref: placeAutocompleteRefCallback, // Use the callback ref
                  id: 'gmp-place-search-input-mapsection',
                  "requested-fields": "id,displayName,formattedAddress,location,addressComponents",
                  "place-types": "locality,administrative_area_level_1,country", // Filter for cities/countries
                  placeholder: "Ej: San Francisco, California",
                  style: { // Basic styling to match ShadCN Input
                    width: '100%',
                    fontSize: '0.875rem', // Corresponds to ShadCN text-sm
                    padding: '0.5rem 0.75rem', // Corresponds to ShadCN px-3 py-2 (for h-10)
                    borderRadius: '0.375rem', // Corresponds to ShadCN rounded-md
                    border: '1px solid hsl(var(--input))',
                    backgroundColor: 'hsl(var(--background))',
                    color: 'hsl(var(--foreground))',
                    boxSizing: 'border-box',
                    height: '2.5rem', // Corresponds to ShadCN h-10
                  },
                } as React.HTMLAttributes<HTMLElement> & { "requested-fields"?: string; "place-types"?: string; placeholder?: string; id?: string; })
              ) : GOOGLE_MAPS_API_KEY && !loadError ? (
                <div className="flex items-center justify-center h-10 border rounded-md bg-muted/50">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Cargando buscador...</span>
                </div>
              ) : null}
            </div>
            
            {/* Form Fields */}
            <FormField
              control={form.control}
              name="name"
              key={`name-${forceRenderKey}`} // Re-key to force update on reset for readOnly
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><MapPin size={16} className="mr-2 h-4 w-4 text-muted-foreground" />Nombre Ciudad</FormLabel>
                  <FormControl>
                    <Input placeholder="Se autocompletará" {...field} readOnly className="bg-muted/30" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="country"
              key={`country-${forceRenderKey}`} // Re-key to force update on reset for readOnly
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Globe className="mr-2 h-4 w-4 text-muted-foreground" />País</FormLabel>
                  <FormControl>
                    <Input placeholder="Se autocompletará" {...field} readOnly className="bg-muted/30" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Hidden fields for lat/lng, still part of the form data */}
            <FormField control={form.control} name="lat" render={({ field }) => <Input type="hidden" {...field} value={field.value || ""} />} />
            <FormField control={form.control} name="lng" render={({ field }) => <Input type="hidden" {...field} value={field.value || ""} />} />


            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="arrivalDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />Fecha Llegada</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                    <FormLabel className="flex items-center"><CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />Fecha Salida</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                    <Textarea placeholder="Añade detalles sobre la ciudad..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Map Preview */}
            {isLoaded && GOOGLE_MAPS_API_KEY && !loadError && previewCenter && (
              <div className="mt-4 h-48 w-full rounded-md overflow-hidden border" key={`map-preview-${previewCenter.lat}-${previewCenter.lng}`}>
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={previewCenter}
                  zoom={10}
                  options={{
                    disableDefaultUI: true,
                    zoomControl: true,
                    gestureHandling: 'cooperative' // Allows user interaction with the preview map
                  }}
                >
                  <MarkerF position={previewCenter} />
                </GoogleMap>
              </div>
            )}

            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting || !isLoaded || !!loadError || (!form.formState.isValid && form.formState.isSubmitted)}>
                {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Añadir Ciudad al Viaje
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );

  // Main component return
  return (
    <SectionCard
      id="map"
      title="Mapa de Viaje"
      icon={<Route size={32} />}
      description="Gestiona y visualiza las ciudades de tu itinerario."
      headerActions={headerActions}
    >
      <div className="space-y-8">
        <div className="p-2 sm:p-0">
          <h3 className="text-xl font-headline text-secondary-foreground mb-4 truncate" title="Ciudades Planificadas">Ciudades Planificadas</h3>
          {cities.length > 0 ? (
             <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cities.map((city: City) => (
                <li key={city.id || city.name} className="p-4 bg-card rounded-lg shadow-md hover:shadow-lg transition-shadow relative group">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-7 w-7 text-muted-foreground hover:text-destructive opacity-50 group-hover:opacity-100 transition-opacity z-10"
                    onClick={() => onDeleteCity(city.id)}
                    aria-label={`Eliminar ${city.name}`}
                  >
                    <Trash2 size={16} />
                  </Button>
                  <div className="space-y-1 mb-2">
                    <p className="font-semibold text-lg text-primary pr-8">
                        <span className="truncate" title={city.name}>{city.name}</span>, 
                        <span className="font-normal text-base text-muted-foreground ml-1 truncate" title={city.country}>{city.country}</span>
                    </p>
                    <p className="text-sm text-foreground/80">
                      {format(parseISO(city.arrivalDate), "d MMM", { locale: es })} - {format(parseISO(city.departureDate), "d MMM yyyy", { locale: es })}
                    </p>
                    {city.notes && <p className="text-xs text-accent-foreground/70 mt-1 italic truncate" title={city.notes}>{city.notes}</p>}
                  </div>
                   {isLoaded && GOOGLE_MAPS_API_KEY && !loadError && city.coordinates && city.coordinates.lat !== 0 && city.coordinates.lng !== 0 ? (
                    <div className="h-32 w-full rounded-md overflow-hidden border mt-2">
                       <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '100%' }}
                        center={city.coordinates}
                        zoom={9}
                        options={{
                          disableDefaultUI: true,
                          gestureHandling: 'none', // Make city card maps non-interactive
                          clickableIcons: false,
                        }}
                      >
                        <MarkerF position={city.coordinates} />
                      </GoogleMap>
                    </div>
                  ) : (
                    <div className="h-32 w-full rounded-md border mt-2 bg-muted/30 flex items-center justify-center">
                        <Info size={20} className="text-muted-foreground" />
                        <p className="text-xs text-muted-foreground ml-1">Vista de mapa no disponible</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-center py-4">No hay ciudades planificadas. ¡Añade la primera!</p>
          )}
        </div>

        {/* Placeholder for main interactive map */}
        <div className="text-center p-4 border-2 border-dashed border-border rounded-lg mt-8">
          <p className="text-muted-foreground">
            Mapa interactivo principal con todas las ciudades y rutas próximamente.
          </p>
          <img data-ai-hint="world map route" src="https://placehold.co/600x400.png" alt="Placeholder for an interactive trip map" className="mt-4 rounded-md mx-auto opacity-50" />
        </div>
      </div>
    </SectionCard>
  );
}

// TypeScript declaration for the Google Maps Place Autocomplete Web Component
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'gmp-place-autocomplete': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        "requested-fields"?: string;
        "place-types"?: string;
        placeholder?: string;
        id?: string;
        value?: string | null; // Add value to allow programmatic clearing
        // Potentially add other properties if needed, e.g., for styling or specific behaviors
      }, HTMLElement>;
    }
  }
}

