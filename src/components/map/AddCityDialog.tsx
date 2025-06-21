
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDays, format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input as ShadcnInput } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle as ShadcnCardTitle,
  CardDescription as ShadcnCardDescription
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { Map, AdvancedMarker, InfoWindow, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Globe, MapPin as MapPinIconLucide, CalendarIcon, StickyNote, Search, Loader2, PlusCircle, Edit3, Camera, Info, List, LocateFixed, Earth } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { City } from '@/lib/types'; // Use City type directly


const citySaveSchema = z.object({
  id: z.string().optional(),
  tripId: z.string(), // Added tripId
  name: z.string().min(1, "El nombre de la ciudad es obligatorio."),
  country: z.string().min(1, "El país es obligatorio."),
  arrivalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  notes: z.string().optional(),
  lat: z.number({ required_error: "La latitud es necesaria." }).min(-90).max(90),
  lng: z.number({ required_error: "La longitud es necesaria." }).min(-180).max(180),
  budget: z.number().optional().nullable(),
}).refine(data => new Date(data.departureDate) >= new Date(data.arrivalDate), {
  message: "La fecha de fin debe ser posterior o igual a la fecha de inicio.",
  path: ["departureDate"],
});

// This is the type for the data that handleSaveCity expects
export type CityFormData = z.infer<typeof citySaveSchema>;


interface PlaceDetailsFromSearch {
  id?: string;
  displayName?: string;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
  country?: string;
  types?: readonly string[];
  photos?: google.maps.places.Photo[];
}

interface AddCityDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSaveCity: (cityData: CityFormData) => Promise<void>;
  initialData?: City | null;
  tripId: string;
  tripStartDate: string;
  existingCities: City[];
}

export default function AddCityDialog({ 
    isOpen, 
    onOpenChange, 
    onSaveCity, 
    initialData, 
    tripId,
    tripStartDate,
    existingCities
}: AddCityDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<google.maps.places.Place[]>([]);
  const [selectedPlaceDetails, setSelectedPlaceDetails] = useState<PlaceDetailsFromSearch | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [accordionValue, setAccordionValue] = useState<string[]>([]); 
  
  const placesLibrary = useMapsLibrary('places');

  const form = useForm<CityFormData>({
    resolver: zodResolver(citySaveSchema),
    defaultValues: { 
      tripId: tripId, 
      name: '', 
      country: '', 
      lat: 0, 
      lng: 0,
      arrivalDate: tripStartDate,
      departureDate: format(addDays(parseISO(tripStartDate), 4), 'yyyy-MM-dd'),
      notes: '',
      budget: undefined,
    },
  });

  useEffect(() => {
    if (isOpen) {
      // Clear previous search state regardless of mode
      setSearchResults([]);
      setIsSearching(false);
      
      if (initialData) {
        // Logic for editing an existing city
        form.reset({
          id: initialData.id,
          tripId: initialData.tripId || tripId,
          name: initialData.name,
          country: initialData.country,
          arrivalDate: initialData.arrivalDate,
          departureDate: initialData.departureDate,
          notes: initialData.notes || '',
          lat: initialData.coordinates.lat,
          lng: initialData.coordinates.lng,
          budget: initialData.budget ?? undefined,
        });
        setSearchTerm(`${initialData.name}, ${initialData.country}`);
        setSelectedPlaceDetails({
            id: initialData.id, 
            displayName: initialData.name,
            formattedAddress: `${initialData.name}, ${initialData.country}`,
            latitude: initialData.coordinates.lat,
            longitude: initialData.coordinates.lng,
            country: initialData.country,
        });
        setAccordionValue(["city-details-item"]);
      } else {
        // NEW LOGIC for adding a new city
        let defaultArrivalDate: string;
        let defaultDepartureDate: string;

        const sortedCities = [...existingCities]
            .filter(c => c.tripId === tripId)
            .sort((a, b) => new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime());

        if (sortedCities.length > 0) {
            const lastCity = sortedCities[sortedCities.length - 1];
            const lastDepartureDate = parseISO(lastCity.departureDate);
            defaultArrivalDate = format(addDays(lastDepartureDate, 1), 'yyyy-MM-dd');
            defaultDepartureDate = format(addDays(lastDepartureDate, 5), 'yyyy-MM-dd'); // Default to a 4-day trip
        } else {
            defaultArrivalDate = tripStartDate;
            defaultDepartureDate = format(addDays(parseISO(tripStartDate), 4), 'yyyy-MM-dd'); // Default to a 4-day trip
        }
        
        form.reset({ 
            tripId: tripId, 
            name: '', 
            country: '', 
            lat: 0, 
            lng: 0,
            arrivalDate: defaultArrivalDate,
            departureDate: defaultDepartureDate,
            notes: '',
            budget: undefined,
        });
        
        // Reset UI state for new city
        setSearchTerm('');
        setSelectedPlaceDetails(null);
        setAccordionValue([]);
      }
    }
  }, [isOpen, initialData, form, tripId, tripStartDate, existingCities]);

  const handleSearch = useCallback(async () => {
    if (!placesLibrary) {
      toast({ title: "Error", description: "Google Places no cargado.", variant: "destructive" });
      return;
    }
    if (!searchTerm.trim()) {
      toast({ title: "Advertencia", description: "Ingresa término de búsqueda." });
      return;
    }
    setSearchResults([]);
    setSelectedPlaceDetails(null);
    setIsSearching(true);
    setAccordionValue([]);
    form.setValue('name', '');
    form.setValue('country', '');

    const request: google.maps.places.SearchByTextRequest = {
      textQuery: searchTerm,
      fields: ['id', 'displayName', 'formattedAddress', 'location', 'types', 'photos', 'addressComponents'],
      language: 'es',
      region: 'ES', // Bias towards Spain, adjust if needed
    };

    try {
      const { places } = await placesLibrary.Place.searchByText(request);
      if (places && places.length > 0) setSearchResults(places);
      else toast({ title: "Sin Resultados", description: "No se encontraron lugares." });
    } catch (error) {
      toast({ title: "Error Búsqueda", description: `${(error as Error).message}`, variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  }, [placesLibrary, searchTerm, toast, form]);

  const handlePlaceSelect = (place: google.maps.places.Place) => {
    let lat: number | undefined, lng: number | undefined, countryName: string | undefined;
    if (place.location) {
      lat = typeof (place.location as google.maps.LatLng).lat === 'function' ? (place.location as google.maps.LatLng).lat() : (place.location as google.maps.LatLngLiteral).lat;
      lng = typeof (place.location as google.maps.LatLng).lng === 'function' ? (place.location as google.maps.LatLng).lng() : (place.location as google.maps.LatLngLiteral).lng;
    }
    if (place.addressComponents) {
      const countryComp = place.addressComponents.find(c => c.types.includes('country'));
      if (countryComp) countryName = countryComp.longText || countryComp.shortText;
    }
    
    setSelectedPlaceDetails({
      id: place.id, displayName: place.displayName, formattedAddress: place.formattedAddress,
      latitude: lat, longitude: lng, country: countryName,
      types: place.types as readonly string[] | undefined, 
      photos: place.photos as google.maps.places.Photo[] | undefined, 
    });
    setAccordionValue(["city-details-item"]);
    
    form.setValue('name', place.displayName || '', { shouldValidate: true });
    form.setValue('country', countryName || '', { shouldValidate: true });
    if (lat !== undefined) form.setValue('lat', lat, { shouldValidate: true }); else form.setValue('lat', 0, {shouldValidate: true});
    if (lng !== undefined) form.setValue('lng', lng, { shouldValidate: true }); else form.setValue('lng', 0, {shouldValidate: true});
    setSearchResults([]);
  };

  const handleFormSubmitInternal = async (data: CityFormData) => {
    setIsSubmitting(true);
    const dataToSave: CityFormData = {
        ...data,
        id: initialData?.id, // Use initialData's id if editing
        tripId: tripId, // Ensure tripId is passed
        name: selectedPlaceDetails?.displayName || data.name,
        country: selectedPlaceDetails?.country || data.country,
        lat: selectedPlaceDetails?.latitude ?? data.lat,
        lng: selectedPlaceDetails?.longitude ?? data.lng,
    };
    try {
      await onSaveCity(dataToSave);
      onOpenChange(false); // Close dialog on success
    } catch (error) { /* Toast handled by caller */ } 
    finally { setIsSubmitting(false); }
  };
  
  const dialogTitleText = initialData ? "Editar Ciudad" : "Añadir Nueva Ciudad";
  const FormIcon = initialData ? Edit3 : PlusCircle;
  const accordionTriggerTitle = selectedPlaceDetails?.displayName 
    ? `Detalles de: ${selectedPlaceDetails.displayName}` 
    : 'Detalles del Lugar Seleccionado';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
          setSearchTerm(''); setSelectedPlaceDetails(null); setAccordionValue([]);
        }
        onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-2xl p-0">
        <div className="flex flex-col h-full max-h-[90vh]">
            <DialogHeader className="p-4 sm:p-6 pb-2 flex-shrink-0">
                <DialogTitle className="font-headline text-2xl text-primary flex items-center">
                    <FormIcon size={22} className="mr-2" />{dialogTitleText}
                </DialogTitle>
                <DialogDescription>Busca una ciudad y luego completa los detalles.</DialogDescription>
            </DialogHeader>

            <div className="px-4 sm:px-6 pt-2 pb-4 flex-shrink-0">
                <Label htmlFor="city-search-input" className="flex items-center text-sm font-medium mb-2">
                    <Search className="mr-2 h-4 w-4 text-muted-foreground" />Buscar Ciudad
                </Label>
                <div className="flex flex-col sm:flex-row gap-2">
                    <ShadcnInput 
                        id="city-search-input" 
                        placeholder="Ej., París, Lima" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); }}}
                        className="flex-grow text-base sm:text-sm" 
                    />
                    <Button 
                        onClick={handleSearch} 
                        disabled={!searchTerm.trim() || !placesLibrary || isSearching} 
                        className="shrink-0"
                    >
                    {isSearching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isSearching ? 'Buscando...' : 'Buscar'}
                    </Button>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="px-4 sm:px-6 py-4 space-y-4">
                  {searchResults.length > 0 && !selectedPlaceDetails && (
                    <Card className="shadow-md">
                      <CardHeader className="pb-2 pt-3">
                        <ShadcnCardTitle className="text-base sm:text-lg flex items-center">
                            <List className="mr-2 h-5 w-5 text-primary" />Resultados ({searchResults.length})
                        </ShadcnCardTitle>
                        <ShadcnCardDescription className="text-xs sm:text-sm">Haz clic en un lugar.</ShadcnCardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 py-2">
                        {searchResults.map((place) => (
                          <Button key={place.id} variant="outline" className="w-full justify-start text-left h-auto py-1.5 sm:py-2 px-2 sm:px-3"
                            onClick={() => handlePlaceSelect(place)}>
                            <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-sm text-foreground truncate">{place.displayName || 'N/A'}</span>
                                <span className="text-xs text-muted-foreground truncate">{place.formattedAddress || 'N/A'}</span>
                            </div>
                          </Button>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {selectedPlaceDetails && (
                    <Accordion type="multiple" value={accordionValue} onValueChange={setAccordionValue} className="w-full">
                      <AccordionItem value="city-details-item" className="border-b-0">
                         <Card className="shadow-lg border-primary">
                          <AccordionTrigger className="w-full px-4 py-3 hover:no-underline data-[state=open]:bg-muted/10 rounded-t-lg">
                              <div className="flex justify-between items-center w-full min-w-0">
                                  <div className="flex items-center text-base sm:text-lg min-w-0">
                                      <Info className="mr-2 h-5 w-5 text-primary shrink-0" />
                                      <span className="font-semibold truncate" title={accordionTriggerTitle}>{accordionTriggerTitle}</span>
                                  </div>
                              </div>
                          </AccordionTrigger>
                          <AccordionContent className="border-t">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs sm:text-sm py-3 px-4">
                                <div>
                                    <p className="flex items-start"><Earth className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground shrink-0" /><strong className="mr-1.5 shrink-0">País:</strong> <span className="break-words">{selectedPlaceDetails.country || 'N/A'}</span></p>
                                    <p className="flex items-start mt-2"><MapPinIconLucide className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground shrink-0" /><strong className="mr-1.5 shrink-0">Lugar:</strong> <span className="break-words">{selectedPlaceDetails.formattedAddress || selectedPlaceDetails.displayName || 'N/A'}</span></p>
                                </div>
                                <div>
                                    <p className="flex items-start"><LocateFixed className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground shrink-0" /><strong className="mr-1.5">Lat:</strong> {selectedPlaceDetails.latitude !== undefined ? selectedPlaceDetails.latitude.toFixed(6) : 'N/A'}</p>
                                    <p className="flex items-start mt-2"><LocateFixed className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground shrink-0" /><strong className="mr-1.5">Lng:</strong> {selectedPlaceDetails.longitude !== undefined ? selectedPlaceDetails.longitude.toFixed(6) : 'N/A'}</p>
                                </div>
                                {selectedPlaceDetails.photos && selectedPlaceDetails.photos.length > 0 && (
                                  <div className="sm:col-span-2 pt-1">
                                    <Label className="font-semibold flex items-center text-xs sm:text-sm mb-1"><Camera className="mr-2 h-4 w-4" />Fotos:</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedPlaceDetails.photos.slice(0, 5).map((photo, idx) => (
                                            <Image key={idx} src={photo.getURI({ maxWidthPx: 100, maxHeightPx: 100 })} alt={`Foto ${idx + 1}`} width={80} height={80} className="rounded-md object-cover" data-ai-hint="city photo"/>
                                        ))}
                                    </div>
                                  </div>
                                )}
                                {selectedPlaceDetails.latitude !== undefined && selectedPlaceDetails.longitude !== undefined && (
                                  <div className="sm:col-span-2 pt-1">
                                    <Label className="font-semibold flex items-center text-xs sm:text-sm mb-1"><Globe className="mr-2 h-4 w-4" />Mapa:</Label>
                                    <div className="mt-1 h-[180px] sm:h-[200px] w-full rounded-md overflow-hidden border">
                                        <Map mapId={`dialog-map-${selectedPlaceDetails.id || Date.now()}`} center={{ lat: selectedPlaceDetails.latitude, lng: selectedPlaceDetails.longitude }} zoom={12} gestureHandling={'greedy'} disableDefaultUI={true} clickableIcons={false} zoomControl={true} className="h-full w-full">
                                            <AdvancedMarker position={{ lat: selectedPlaceDetails.latitude, lng: selectedPlaceDetails.longitude }} />
                                        </Map>
                                    </div>
                                  </div>
                                )}
                              </div>
                          </AccordionContent>
                        </Card>
                      </AccordionItem>
                    </Accordion>
                  )}
                  <Separator className="my-3" />
                  <Form {...form}>
                    <form className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField control={form.control} name="arrivalDate" render={({ field }) => (
                              <FormItem><FormLabel className="flex items-center text-xs sm:text-sm"><CalendarIcon className="mr-2 h-4 w-4" />Llegada</FormLabel><FormControl><ShadcnInput type="date" {...field} className="text-sm" /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="departureDate" render={({ field }) => (
                              <FormItem><FormLabel className="flex items-center text-xs sm:text-sm"><CalendarIcon className="mr-2 h-4 w-4" />Salida</FormLabel><FormControl><ShadcnInput type="date" {...field} className="text-sm" /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                        <FormField control={form.control} name="budget" render={({ field }) => (
                            <FormItem><FormLabel className="flex items-center text-xs sm:text-sm"><MapPinIconLucide className="mr-2 h-4 w-4" />Presupuesto (opc.)</FormLabel>
                            <FormControl><ShadcnInput type="number" placeholder="Ej: 1500" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} className="text-sm" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="notes" render={({ field }) => (
                            <FormItem><FormLabel className="flex items-center text-xs sm:text-sm"><StickyNote className="mr-2 h-4 w-4" />Notas (opc.)</FormLabel><FormControl><Textarea placeholder="Info adicional..." {...field} className="text-sm" rows={3} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </form>
                  </Form>
                </div>
            </div>
            
            <DialogFooter className="p-4 sm:p-6 pt-4 mt-auto border-t flex-shrink-0">
              <DialogClose asChild><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button></DialogClose>
              <Button type="button" onClick={form.handleSubmit(handleFormSubmitInternal)} disabled={isSubmitting || isSearching || (!selectedPlaceDetails && !initialData?.coordinates) || !form.formState.isValid}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{initialData ? 'Guardar Cambios' : 'Añadir Ciudad'}
              </Button>
            </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
