
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input as ShadcnInput } from '@/components/ui/input'; // Renamed to avoid conflict with potential 'Input' variable
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image'; // Using Next.js Image component
import { Map, AdvancedMarker, Pin, InfoWindow, useMapsLibrary } from '@vis.gl/react-google-maps';

import { Globe, MapPin as MapPinIconLucide, CalendarIcon, StickyNote, Search, Loader2, PlusCircle, Edit3, Camera, Info, List } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { City, Coordinates } from '@/lib/types';
// GOOGLE_MAPS_SCRIPT_ID and GOOGLE_MAPS_LIBRARIES are no longer needed here if APIProvider handles loading

// Schema for saving city data (used by the form and onSaveCity prop)
const citySaveSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "El nombre de la ciudad es obligatorio."),
  country: z.string().min(1, "El país es obligatorio."),
  arrivalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  notes: z.string().optional(),
  lat: z.number({ required_error: "La latitud es necesaria. Selecciona una ciudad de la búsqueda." }).min(-90).max(90),
  lng: z.number({ required_error: "La longitud es necesaria. Selecciona una ciudad de la búsqueda." }).min(-180).max(180),
  budget: z.number().optional().nullable(),
});
export type CityFormData = z.infer<typeof citySaveSchema>;

// Interface for the details extracted from Google Places API
interface PlaceDetailsFromSearch {
  id?: string;
  displayName?: string;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
  country?: string;
  // Use 'readonly string[]' as per Google Maps API 'Place' type for 'types'
  types?: readonly string[]; 
  photos?: google.maps.places.Photo[]; // Store Photo objects to use getURI
}

interface AddCityDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSaveCity: (cityData: CityFormData) => Promise<void>;
  initialData?: City | null;
  // isLoaded and loadError props are no longer needed here
}

const defaultNewCityRHFValues: Omit<CityFormData, 'id' | 'name' | 'country' | 'lat' | 'lng'> = {
  arrivalDate: new Date().toISOString().split('T')[0],
  departureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default to 7 days later
  notes: '',
  budget: undefined,
};

export default function AddCityDialog({ isOpen, onOpenChange, onSaveCity, initialData }: AddCityDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // States for Google Places Search
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<google.maps.places.Place[]>([]);
  const [selectedPlaceDetails, setSelectedPlaceDetails] = useState<PlaceDetailsFromSearch | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // Hook to load the Places library from @vis.gl/react-google-maps
  const placesLibrary = useMapsLibrary('places');

  const form = useForm<CityFormData>({
    resolver: zodResolver(citySaveSchema),
    defaultValues: initialData 
      ? { ...initialData, lat: initialData.coordinates.lat, lng: initialData.coordinates.lng, budget: initialData.budget ?? undefined }
      : { ...defaultNewCityRHFValues, name: '', country: '', lat: 0, lng: 0 }, // Provide all fields for RHF
  });

  useEffect(() => {
    if (isOpen) {
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
          budget: initialData.budget ?? undefined,
        });
        // Pre-fill search term and selected place details for editing
        setSearchTerm(`${initialData.name}, ${initialData.country}`);
        setSelectedPlaceDetails({
            id: initialData.id, // Use city's own ID for consistency if it's a Place ID
            displayName: initialData.name,
            formattedAddress: `${initialData.name}, ${initialData.country}`, // Approximate
            latitude: initialData.coordinates.lat,
            longitude: initialData.coordinates.lng,
            country: initialData.country,
            types: [], // Not available from our City type, keep empty or fetch if needed
            photos: [] // Not available, keep empty or fetch if needed
        });
      } else {
        form.reset({ ...defaultNewCityRHFValues, name: '', country: '', lat: 0, lng: 0 });
        setSearchTerm('');
        setSelectedPlaceDetails(null);
      }
      setSearchResults([]); // Clear previous search results
      setIsSearching(false); // Reset searching state
    }
  }, [isOpen, initialData, form]);

  const handleSearch = useCallback(async () => {
    if (!placesLibrary) {
      toast({ title: "Error", description: "La librería de Google Places no está cargada.", variant: "destructive" });
      console.error("AddCityDialog: placesLibrary not loaded.");
      return;
    }
    if (!searchTerm.trim()) {
      toast({ title: "Advertencia", description: "Por favor, ingresa un término de búsqueda.", variant: "default" });
      return;
    }

    setSearchResults([]);
    setSelectedPlaceDetails(null); // Clear previous selection when a new search starts
    setIsSearching(true);
    form.setValue('name', ''); // Clear RHF fields that will be populated by search
    form.setValue('country', '');
    form.setValue('lat', 0); 
    form.setValue('lng', 0);

    const request: google.maps.places.SearchByTextRequest = {
      textQuery: searchTerm,
      fields: ['id', 'displayName', 'formattedAddress', 'location', 'types', 'photos', 'addressComponents'],
      language: 'es',
      region: 'ES', // Bias towards Spain, adjust if needed
      // includedType: 'locality', // This can be too restrictive, consider removing or adjusting
    };

    console.log('DEBUG: Initiating Google Maps Place.searchByText with query:', searchTerm, 'and request:', JSON.stringify(request));

    try {
      const { places } = await placesLibrary.Place.searchByText(request);
      
      console.log('DEBUG: Google Maps API Response:', places);

      if (places && places.length > 0) {
        setSearchResults(places);
        toast({ title: "Búsqueda Exitosa", description: `Se encontraron ${places.length} lugares.` });
      } else {
        setSearchResults([]);
        toast({ title: "Búsqueda Sin Resultados", description: "No se encontraron lugares para tu búsqueda." });
      }
    } catch (error) {
      console.error("Error during Google Maps search:", error);
      toast({ title: "Error en la Búsqueda", description: `Error al contactar la API de Google: ${(error as Error).message}`, variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  }, [placesLibrary, searchTerm, toast, form]);

  const handlePlaceSelect = (place: google.maps.places.Place) => {
    console.log('DEBUG: Place selected from list:', JSON.parse(JSON.stringify(place))); // Deep copy for logging
    
    let lat: number | undefined = undefined;
    let lng: number | undefined = undefined;

    // Correctly access lat/lng from place.location (which can be LatLng or LatLngLiteral)
    if (place.location) {
        if (typeof place.location.lat === 'function') {
            lat = place.location.lat();
        } else if (typeof (place.location as google.maps.LatLngLiteral).lat === 'number') {
            lat = (place.location as google.maps.LatLngLiteral).lat;
        }
        if (typeof place.location.lng === 'function') {
            lng = place.location.lng();
        } else if (typeof (place.location as google.maps.LatLngLiteral).lng === 'number') {
            lng = (place.location as google.maps.LatLngLiteral).lng;
        }
    }

    let countryName: string | undefined = undefined;
    if (place.addressComponents) {
      const countryComponent = place.addressComponents.find(component => component.types.includes('country'));
      if (countryComponent) {
        countryName = countryComponent.longText || countryComponent.shortText;
      }
    }
    
    // Update state with the full Place object details, including photos
    const placeDetailsToSet: PlaceDetailsFromSearch = {
      id: place.id,
      displayName: place.displayName,
      formattedAddress: place.formattedAddress,
      latitude: lat,
      longitude: lng,
      country: countryName,
      types: place.types as readonly string[] | undefined, // Cast to make TS happy if types exist
      photos: place.photos as google.maps.places.Photo[] | undefined, // Store actual Photo objects
    };
    
    setSelectedPlaceDetails(placeDetailsToSet);
    
    // Update React Hook Form fields
    form.setValue('name', place.displayName || '', { shouldValidate: true });
    form.setValue('country', countryName || '', { shouldValidate: true });
    if (lat !== undefined) form.setValue('lat', lat, { shouldValidate: true }); else form.setValue('lat', 0, {shouldValidate: true}); // Default to 0 if undefined
    if (lng !== undefined) form.setValue('lng', lng, { shouldValidate: true }); else form.setValue('lng', 0, {shouldValidate: true}); // Default to 0 if undefined

    setSearchResults([]); // Hide search results list
  };

  const handleFormSubmit = async (data: CityFormData) => {
    setIsSubmitting(true);
    // Ensure lat/lng are not 0,0 if it's a new city and nothing was selected (could be a form validation instead)
    if ((data.lat === 0 && data.lng === 0) && !initialData?.coordinates && !(selectedPlaceDetails?.latitude === 0 && selectedPlaceDetails?.longitude === 0) && !selectedPlaceDetails?.latitude) {
      toast({ variant: "destructive", title: "Coordenadas Inválidas", description: "Por favor, busca y selecciona una ciudad para obtener coordenadas válidas." });
      setIsSubmitting(false);
      return;
    }

    // Prioritize data from selectedPlaceDetails if available, otherwise use form data (which might be from initialData)
    const dataToSave: CityFormData = {
        ...data, // Includes arrivalDate, departureDate, notes, budget from form
        id: initialData?.id, // Preserve ID if editing
        name: selectedPlaceDetails?.displayName || data.name, // Use selected place name or existing form name
        country: selectedPlaceDetails?.country || data.country,
        lat: selectedPlaceDetails?.latitude ?? data.lat, // Use selected place lat or existing form lat
        lng: selectedPlaceDetails?.longitude ?? data.lng,
    };

    try {
      await onSaveCity(dataToSave);
      onOpenChange(false); // Close dialog on successful save
    } catch (error) {
      // Error toast is usually handled by the calling component (DashboardView -> MapSection)
      console.error("AddCityDialog: Error saving city:", error);
      // toast({ variant: "destructive", title: "Error al Guardar", description: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const dialogTitle = initialData ? "Editar Ciudad" : "Añadir Nueva Ciudad";
  const FormIcon = initialData ? Edit3 : PlusCircle;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
            // Reset states when dialog is closed by any means (X, Cancel, ESC)
            setSearchTerm('');
            setSearchResults([]);
            setSelectedPlaceDetails(null);
            setIsSearching(false);
            // form.reset(); // Consider if form reset is needed here or only on explicit cancel/successful add
        }
        onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-2 flex-shrink-0">
          <DialogTitle className="font-headline text-2xl text-primary flex items-center">
            <FormIcon size={22} className="mr-2" />
            {dialogTitle}
          </DialogTitle>
          <DialogDescription>
            Busca una ciudad, selecciona un resultado y luego completa las fechas y notas de tu estancia.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-4 items-end gap-2 sm:gap-4 p-6 pt-2 flex-shrink-0">
            <div className="sm:col-span-3 space-y-1">
            <Label htmlFor="city-search-input" className="flex items-center text-sm font-medium">
                <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                Buscar Ciudad por Nombre
            </Label>
            <ShadcnInput
                id="city-search-input"
                placeholder="Ej., París, Lima, Tokio"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); }}}
                className="text-base sm:text-sm"
            />
            </div>
            <Button onClick={handleSearch} disabled={!searchTerm.trim() || !placesLibrary || isSearching} className="w-full sm:w-auto">
            {isSearching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSearching ? 'Buscando...' : 'Buscar'}
            </Button>
        </div>
        
        {/* This div will be the flex item that grows and handles its own scrolling */}
        <div className="flex-1 min-h-0"> 
            <ScrollArea className="h-full w-full">
                <div className="px-6 py-4 space-y-4"> {/* Padding applied to the content wrapper */}
                    {searchResults.length > 0 && !selectedPlaceDetails && (
                    <Card className="shadow-md">
                        <CardHeader className="pb-2 pt-3">
                        <CardTitle className="text-base sm:text-lg flex items-center">
                            <List className="mr-2 h-5 w-5 text-primary" />
                            Resultados de la Búsqueda ({searchResults.length})
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Haz clic en un lugar para ver sus detalles.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 max-h-[250px] sm:max-h-[300px] overflow-y-auto py-2">
                        {searchResults.map((place) => (
                            <Button
                            key={place.id}
                            variant="outline"
                            className="w-full justify-start text-left h-auto py-1.5 sm:py-2 px-2 sm:px-3 hover:bg-accent/50 transition-colors duration-150"
                            onClick={() => handlePlaceSelect(place)}
                            >
                            <div className="flex flex-col">
                                <span className="font-semibold text-sm text-foreground">{place.displayName || 'Nombre no disponible'}</span>
                                <span className="text-xs text-muted-foreground">{place.formattedAddress || 'Dirección no disponible'}</span>
                            </div>
                            </Button>
                        ))}
                        </CardContent>
                    </Card>
                    )}

                    {selectedPlaceDetails && (
                    <Card className="shadow-lg border-primary">
                        <CardHeader className="pb-2 pt-3">
                        <CardTitle className="text-base sm:text-lg flex items-center">
                            <Info className="mr-2 h-5 w-5 text-primary" />
                            Detalles del Lugar Seleccionado
                        </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs sm:text-sm py-3">
                        <p><strong>Nombre:</strong> {selectedPlaceDetails.displayName}</p>
                        <p><strong>Dirección:</strong> {selectedPlaceDetails.formattedAddress}</p>
                        {selectedPlaceDetails.country && <p><strong>País:</strong> {selectedPlaceDetails.country}</p>}
                        {selectedPlaceDetails.id && <p><strong>Place ID:</strong> {selectedPlaceDetails.id}</p>}
                        {selectedPlaceDetails.latitude !== undefined && <p><strong>Latitud:</strong> {selectedPlaceDetails.latitude.toFixed(6)}</p>}
                        {selectedPlaceDetails.longitude !== undefined && <p><strong>Longitud:</strong> {selectedPlaceDetails.longitude.toFixed(6)}</p>}
                        {selectedPlaceDetails.types && selectedPlaceDetails.types.length > 0 && (
                            <div className="flex flex-wrap gap-1 items-baseline">
                            <strong className="text-xs sm:text-sm">Tipos:</strong>
                            {selectedPlaceDetails.types.map(type => <Badge key={type} variant="secondary" className="text-xs">{type}</Badge>)}
                            </div>
                        )}
                        
                        {selectedPlaceDetails.photos && selectedPlaceDetails.photos.length > 0 ? (
                            <div className="pt-1">
                            <Label className="font-semibold flex items-center text-xs sm:text-sm">
                                <Camera className="mr-2 h-4 w-4 text-primary" />
                                Fotos ({Math.min(selectedPlaceDetails.photos.length, 5)} de {selectedPlaceDetails.photos.length}):
                            </Label>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {selectedPlaceDetails.photos.slice(0, 5).map((photo, index) => {
                                const photoUrl = photo.getURI({ maxWidthPx: 100, maxHeightPx: 100 });
                                return (
                                    <Image
                                    key={photoUrl || index}
                                    src={photoUrl}
                                    alt={`Foto de ${selectedPlaceDetails.displayName || 'lugar seleccionado'} ${index + 1}`}
                                    width={80}
                                    height={80}
                                    className="rounded-md object-cover shadow-md hover:opacity-90 transition-opacity"
                                    data-ai-hint="city landmark"
                                    />
                                );
                                })}
                            </div>
                            {selectedPlaceDetails.photos.length > 5 && <p className="text-xs text-muted-foreground mt-1">Mostrando las primeras 5 fotos.</p>}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground pt-1">No hay fotos disponibles para este lugar.</p>
                        )}

                        {selectedPlaceDetails.latitude !== undefined && selectedPlaceDetails.longitude !== undefined && (
                            <div className="pt-1">
                            <Label className="font-semibold flex items-center text-xs sm:text-sm">
                                <Globe className="mr-2 h-4 w-4 text-primary" />
                                Ubicación en el Mapa:
                            </Label>
                            <div className="mt-1 h-[180px] sm:h-[200px] w-full rounded-md overflow-hidden border shadow-inner">
                                <Map
                                mapId={`selected-city-map-${selectedPlaceDetails.id || Date.now()}`}
                                center={{ lat: selectedPlaceDetails.latitude, lng: selectedPlaceDetails.longitude }}
                                zoom={12}
                                gestureHandling={'greedy'}
                                disableDefaultUI={true}
                                className="h-full w-full"
                                >
                                <AdvancedMarker 
                                    position={{ lat: selectedPlaceDetails.latitude, lng: selectedPlaceDetails.longitude }}
                                    title={selectedPlaceDetails.displayName || 'Ubicación seleccionada'}
                                />
                                </Map>
                            </div>
                            </div>
                        )}
                        </CardContent>
                    </Card>
                    )}
                    
                    <Separator className="my-3" />

                    <Form {...form}>
                    <form className="space-y-4"> 
                        {/* Hidden RHF fields for data from search */}
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem className="hidden"><FormLabel>Nombre Ciudad (del buscador)</FormLabel><FormControl><ShadcnInput {...field} readOnly /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="country" render={({ field }) => (
                            <FormItem className="hidden"><FormLabel>País (del buscador)</FormLabel><FormControl><ShadcnInput {...field} readOnly /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="lat" render={({ field }) => <ShadcnInput type="hidden" {...field} />} />
                        <FormField control={form.control} name="lng" render={({ field }) => <ShadcnInput type="hidden" {...field} />} />

                        {/* Visible form fields for user input */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="arrivalDate" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center text-xs sm:text-sm"><CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />Fecha de Llegada</FormLabel>
                                <FormControl><ShadcnInput type="date" {...field} className="text-sm" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="departureDate" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center text-xs sm:text-sm"><CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />Fecha de Salida</FormLabel>
                                <FormControl><ShadcnInput type="date" {...field} className="text-sm" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        </div>
                        <FormField
                            control={form.control}
                            name="budget"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="flex items-center text-xs sm:text-sm">
                                    <MapPinIconLucide className="mr-2 h-4 w-4 text-muted-foreground" />Presupuesto (opcional)
                                </FormLabel>
                                <FormControl>
                                    <ShadcnInput
                                    type="number"
                                    placeholder="Ej: 1500"
                                    {...field}
                                    value={field.value ?? ''} // Handle null/undefined for number input
                                    onChange={e => {
                                        const value = e.target.value;
                                        field.onChange(value === '' ? undefined : parseFloat(value)); // Store as number or undefined
                                    }}
                                    className="text-sm"
                                    />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField control={form.control} name="notes" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center text-xs sm:text-sm"><StickyNote className="mr-2 h-4 w-4 text-muted-foreground" />Notas (opcional)</FormLabel>
                                <FormControl><Textarea placeholder="Información adicional sobre tu estancia en esta ciudad..." {...field} className="text-sm" rows={3} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </form>
                    </Form>
                </div>
            </ScrollArea>
        </div>
        
        <DialogFooter className="p-6 pt-4 flex-shrink-0 border-t mt-auto">
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancelar</Button>
          </DialogClose>
          <Button type="button" onClick={form.handleSubmit(handleFormSubmit)} disabled={isSubmitting || isSearching || (!selectedPlaceDetails && !initialData)}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? 'Guardar Cambios' : 'Añadir Ciudad'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
