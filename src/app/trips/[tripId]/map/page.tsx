
"use client";

import MapSection from '@/components/map/MapSection';
import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import type { TripDetails, City } from '@/lib/types';
import type { CityFormData } from '@/components/map/AddCityDialog';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc, query, orderBy as firestoreOrderBy } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';

// Mock function to fetch full trip details
async function fetchFullTripDataForMap(tripId: string): Promise<TripDetails | null> {
  await new Promise(resolve => setTimeout(resolve, 500));
  const storedTrips = localStorage.getItem('familyTrips');
  if (storedTrips) {
    const trips: TripDetails[] = JSON.parse(storedTrips);
    const currentTrip = trips.find(t => t.id === tripId);
     if (currentTrip) {
      const { sampleTripDetails } = await import('@/lib/constants');
      return {
        ...sampleTripDetails,
        ...currentTrip,
        id: tripId,
        activities: (currentTrip.activities || sampleTripDetails.activities).map(a => ({ ...a, tripId })),
        ciudades: (currentTrip.ciudades || sampleTripDetails.ciudades).map(c => ({ ...c, tripId })),
        expenses: (currentTrip.expenses || sampleTripDetails.expenses).map(e => ({ ...e, tripId })),
      };
    }
  }
  const { sampleTripDetails } = await import('@/lib/constants');
  if (tripId === sampleTripDetails.id) return sampleTripDetails;
  return null;
}


export default function TripMapPage() {
  const params = useParams();
  const tripId = params.tripId as string;
  const [tripData, setTripData] = useState<TripDetails | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchCities = useCallback(async () => {
    if (!tripId) return;
    // setIsLoading(true); // Managed by initial load or specific action triggers
    try {
      const citiesCollectionRef = collection(db, "trips", tripId, "cities");
      const q = query(citiesCollectionRef, firestoreOrderBy("arrivalDate"));
      const querySnapshot = await getDocs(q);
      const fetchedCities: City[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), tripId } as City));
      setCities(fetchedCities);

      setTripData(prev => prev ? ({ ...prev, ciudades: fetchedCities }) : null);

    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: `No se pudieron cargar ciudades: ${error.message}` });
    }
    // finally { setIsLoading(false); } // Managed by initial load or specific action triggers
  }, [tripId, toast]);

  useEffect(() => {
    let isMounted = true;
    if (tripId) {
      const loadInitialData = async () => {
        if(!isMounted) return;
        setIsLoading(true);
        try {
            const initialData = await fetchFullTripDataForMap(tripId);
            if(!isMounted) return;
            setTripData(initialData);
            if (initialData) {
                setCities(initialData.ciudades || []);
            }
            await fetchCities(); 
        } catch (e) {
            if(!isMounted) return;
            toast({ variant: "destructive", title: "Error", description: `No se pudieron cargar datos del mapa.`});
            console.error("Error loading initial map data:", e);
        } finally {
            if(isMounted) {
                setIsLoading(false);
            }
        }
      };
      loadInitialData();
    }
    return () => { isMounted = false; };
  }, [tripId, fetchCities]);


  const handleSaveCity = async (cityData: CityFormData) => {
    if (!tripId) return;
    const { id, lat, lng, ...dataToSave } = cityData;
    const cityObjectForFirestore: Omit<City, 'id'> = {
      ...dataToSave,
      tripId: tripId,
      coordinates: { lat, lng },
    };
    try {
      if (id) {
        const cityRef = doc(db, "trips", tripId, "cities", id);
        await setDoc(cityRef, cityObjectForFirestore, { merge: true });
        toast({ title: "Ciudad Actualizada", description: `"${cityData.name}" actualizada.` });
      } else {
        const citiesCollectionRef = collection(db, "trips", tripId, "cities");
        await addDoc(citiesCollectionRef, cityObjectForFirestore);
        toast({ title: "Ciudad Añadida", description: `"${cityData.name}" añadida.` });
      }
      fetchCities();
    } catch (error: any) {
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
      fetchCities();
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

