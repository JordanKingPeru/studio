"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import type { CityFormData } from '@/components/map/AddCityDialog';
import { useToast } from "@/hooks/use-toast";

type ExtractedPlaceData = Omit<CityFormData, 'id' | 'arrivalDate' | 'departureDate' | 'notes'> & {
    formattedAddress?: string;
    countryFound: boolean;
};

export function usePlaceAutocomplete({ isLoaded }: { isLoaded: boolean }) {
    const { toast } = useToast();
    const placeAutocompleteElementRef = useRef<HTMLElement & { value?: string; place?: google.maps.places.PlaceResult }>(null);
    const [extractedPlace, setExtractedPlace] = useState<ExtractedPlaceData | null>(null);
    const [autocompleteError, setAutocompleteError] = useState<string | null>(null);

    const handleGmpPlaceChange = useCallback(async (event: CustomEvent<{ place: google.maps.places.PlaceResult }>) => {
        setAutocompleteError(null);
        const placeResultFromEvent = event.detail?.place;

        if (!placeResultFromEvent) {
            console.warn("usePlaceAutocomplete: Event 'gmp-placechange' did not contain place details.");
            toast({ variant: "destructive", title: "Selección Vacía", description: "No se pudo obtener información del lugar seleccionado." });
            return;
        }
        
        console.log("usePlaceAutocomplete: Raw 'place' object from 'gmp-placechange':", placeResultFromEvent ? JSON.parse(JSON.stringify(placeResultFromEvent)) : "NULL OR UNDEFINED");

        try {
            await placeResultFromEvent.fetchFields({
                fields: ['displayName', 'formattedAddress', 'geometry', 'addressComponents', 'name', 'types'],
            });

            const lat = placeResultFromEvent.geometry?.location?.lat();
            const lng = placeResultFromEvent.geometry?.location?.lng();
            
            let extractedCityName = '';
            let extractedCountryName = '';

            if (placeResultFromEvent.addressComponents) {
                for (const component of placeResultFromEvent.addressComponents) {
                    if (component.types.includes('locality')) {
                        extractedCityName = component.longText || component.shortText || '';
                    } else if (component.types.includes('administrative_area_level_1') && !extractedCityName) {
                        if (!placeResultFromEvent.addressComponents.some(c => c.types.includes('locality'))) {
                            extractedCityName = component.longText || component.shortText || '';
                        }
                    }
                    if (component.types.includes('country')) {
                        extractedCountryName = component.longText || component.shortText || '';
                    }
                }
            }
            
            if (!extractedCityName && placeResultFromEvent.displayName) {
                extractedCityName = placeResultFromEvent.displayName;
                if (extractedCountryName && extractedCityName.includes(extractedCountryName)) {
                    extractedCityName = extractedCityName.replace(`, ${extractedCountryName}`, '').replace(extractedCountryName, '').trim();
                }
            }

            if (!extractedCityName && placeResultFromEvent.name && placeResultFromEvent.types?.includes('locality')) {
                extractedCityName = placeResultFromEvent.name;
            }

            console.log(`usePlaceAutocomplete: Finally extracted - City: "${extractedCityName}", Country: "${extractedCountryName}", Lat: ${lat}, Lng: ${lng}`);

            if (extractedCityName && typeof lat === 'number' && typeof lng === 'number') {
                setExtractedPlace({
                    name: extractedCityName,
                    country: extractedCountryName,
                    lat,
                    lng,
                    formattedAddress: placeResultFromEvent.formattedAddress,
                    countryFound: !!extractedCountryName,
                });
                toast({ title: "Ciudad Seleccionada", description: `${extractedCityName}${extractedCountryName ? ', ' + extractedCountryName : ''} autocompletada.` });
            } else {
                const errorMsg = "No se pudo extraer toda la información necesaria del lugar. Revisa la consola.";
                setAutocompleteError(errorMsg);
                toast({ variant: "destructive", title: "Datos Incompletos", description: errorMsg });
                console.error("usePlaceAutocomplete: Failed to extract all place data. Extracted:", { extractedCityName, extractedCountryName, lat, lng });
            }
        } catch (error) {
            const errorMsg = `No se pudo obtener detalles del lugar: ${(error as Error).message}`;
            setAutocompleteError(errorMsg);
            console.error("usePlaceAutocomplete: Error in fetchFields or post-processing:", error);
            toast({ variant: "destructive", title: "Error de Google Maps", description: errorMsg });
        }
    }, [toast]);

    useEffect(() => {
        const autocompleteElement = placeAutocompleteElementRef.current;
        if (!isLoaded || !autocompleteElement) return;

        const eventListenerCallback = (event: Event) => {
            handleGmpPlaceChange(event as CustomEvent<{ place: google.maps.places.PlaceResult }>);
        };
        
        console.log("usePlaceAutocomplete: Attaching 'gmp-placechange' listener to:", autocompleteElement);
        autocompleteElement.addEventListener('gmp-placechange', eventListenerCallback);

        return () => {
            if (autocompleteElement) {
                console.log("usePlaceAutocomplete: Cleaning up 'gmp-placechange' listener from:", autocompleteElement);
                autocompleteElement.removeEventListener('gmp-placechange', eventListenerCallback);
            }
        };
    }, [isLoaded, handleGmpPlaceChange]);

    const clearAutocomplete = () => {
        if (placeAutocompleteElementRef.current) {
            placeAutocompleteElementRef.current.value = '';
        }
        setExtractedPlace(null);
        setAutocompleteError(null);
    }

    return { placeAutocompleteElementRef, extractedPlace, autocompleteError, clearAutocomplete };
}
