
"use client";

import MapSection from '@/components/map/MapSection';
import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import type { Trip, TripDetails, City, Coordinates } from '@/lib/types';
import type { CityFormData } from '@/components/map/AddCityDialog';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy as firestoreOrderBy, getDoc as getFirestoreDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';

// Function to fetch base trip data from Firestore
async function fetchBaseTripData(tripId: string): Promise<Trip | null> {
  const tripRef = doc(db, "trips", tripId);
  const tripSnap = await getFirestoreDoc(tripRef);
  if (!tripSnap.exists()) {
    console.warn(`Base trip data for ID ${tripId} not found.`);
    return null;
  }
  const data = tripSnap.data();
  return {
    id: tripSnap.id,
    ownerUid: data.ownerUid,
    name: data.name,
    startDate: data.startDate,
    endDate: data.endDate,
    coverImageUrl: data.coverImageUrl,
    tripType: data.tripType,
    tripStyle: data.tripStyle,
    editorUids: data.editorUids || [],
    pendingInvites: data.pendingInvites || [],
    familia: data.familia,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date(data.createdAt || Date.now()).toISOString(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : new Date(data.updatedAt || Date.now()).toISOString(),
  } as Trip;
}

export default function TripMapPage() {
  const params = useParams();
  const tripId = params.tripId as string;
  const [tripData, setTripData] = useState<TripDetails | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchCitiesAndPopulateTripData = useCallback(async () => {
    if (!tripId) return;
    try {
      const citiesCollectionRef = collection(db, "trips", tripId, "cities");
      const q = query(citiesCollectionRef, firestoreOrderBy("arrivalDate"));
      const querySnapshot = await getDocs(q);
      const fetchedCities: City[] = querySnapshot.docs.map(d => ({ id: d.id, ...d.data(), tripId } as City));
      setCities(fetchedCities);

      setTripData(prev => {
        if (!prev) return null;
        const paises = Array.from(new Set(fetchedCities.map(city => city.country)));
        return { ...prev, ciudades: fetchedCities, paises, activities: prev.activities || [], expenses: prev.expenses || [], userId: prev.ownerUid };
      });

    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: `No se pudieron cargar ciudades: ${error.message}` });
    }
  }, [tripId, toast]);

  useEffect(() => {
    let isMounted = true;
    if (tripId) {
      const loadInitialData = async () => {
        if(!isMounted) return;
        setIsLoading(true);
        try {
            const baseTrip = await fetchBaseTripData(tripId);
            if(!isMounted) return;

            if (baseTrip) {
                setTripData({
                    ...baseTrip,
                    userId: baseTrip.ownerUid, 
                    ciudades: [], paises: [], activities: [], expenses: [],
                });
                await fetchCitiesAndPopulateTripData();
            } else {
                toast({ variant: "destructive", title: "Error", description: `No se encontraron datos del viaje con ID: ${tripId}.`});
                setTripData(null);
            }
        } catch (e) {
            if(!isMounted) return;
            toast({ variant: "destructive", title: "Error", description: `No se pudieron cargar datos del mapa.`});
            console.error("Error loading initial map data:", e);
            setTripData(null);
        } finally {
            if(isMounted) {
                setIsLoading(false);
            }
        }
      };
      loadInitialData();
    } else {
        setIsLoading(false);
        setTripData(null);
    }
    return () => { isMounted = false; };
  }, [tripId, fetchCitiesAndPopulateTripData, toast]);


  const handleSaveCity = async (cityData: CityFormData) => {
    if (!tripId) return;
    const { lat, lng, ...dataToSave } = cityData;

    const cityPayloadForFirestore: Partial<Omit<City, 'id' | 'createdAt' | 'updatedAt'>> & { coordinates: Coordinates; tripId: string; name: string; country: string; arrivalDate: string; departureDate: string; updatedAt: any; createdAt?: any;} = {
      name: dataToSave.name,
      country: dataToSave.country,
      arrivalDate: dataToSave.arrivalDate,
      departureDate: dataToSave.departureDate,
      tripId: tripId,
      coordinates: { lat, lng },
      updatedAt: serverTimestamp(),
    };

    if (dataToSave.notes !== undefined && dataToSave.notes !== '') {
      cityPayloadForFirestore.notes = dataToSave.notes;
    }
    if (typeof dataToSave.budget === 'number') {
      cityPayloadForFirestore.budget = dataToSave.budget;
    }


    try {
      if (cityData.id) {
        const cityRef = doc(db, "trips", tripId, "cities", cityData.id);
        await setDoc(cityRef, cityPayloadForFirestore, { merge: true });
        toast({ title: "Ciudad Actualizada", description: `"${cityData.name}" actualizada.` });
      } else {
        const newCityRef = doc(collection(db, "trips", tripId, "cities"));
        cityPayloadForFirestore.createdAt = serverTimestamp();
        await setDoc(newCityRef, { ...cityPayloadForFirestore, id: newCityRef.id }); 
        toast({ title: "Ciudad Añadida", description: `"${cityData.name}" añadida.` });
      }
      fetchCitiesAndPopulateTripData();
    } catch (error: any) {
      console.error("Error saving city to Firestore:", error);
      toast({ variant: "destructive", title: "Error", description: `No se pudo guardar ciudad: ${error.message}` });
      throw error;
    }
  };

  const handleDeleteCity = async (cityIdToDelete: string) => {
    if (!tripId) return;
    const city = cities.find(c => c.id === cityIdToDelete);
    if (!city) return;
    try {
      const cityRef = doc(db, "trips", tripId, "cities", cityIdToDelete);
      await deleteDoc(cityRef);
      toast({ title: "Ciudad Eliminada", description: `"${city.name}" eliminada.` });
      fetchCitiesAndPopulateTripData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: `No se pudo eliminar "${city.name}": ${error.message}` });
    }
  };


  if (isLoading || !tripData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Cargando mapa y ciudades...</p>
      </div>
    );
  }

  return (
    <div className="py-8">
      <MapSection
        tripData={tripData}
        cities={cities}
        onSaveCity={handleSaveCity}
        onDeleteCity={handleDeleteCity}
        tripId={tripId}
      />
    </div>
  );
}
