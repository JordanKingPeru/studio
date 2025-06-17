
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, LogOut, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import CreateTripWizard from '@/components/trips/CreateTripWizard';
import type { Trip } from '@/lib/types';
// TripType and TripStyle are already imported in CreateTripWizard, no need here if not directly used
import { format, parseISO, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
// v4 as uuidv4 is no longer needed for trip IDs if Firestore generates them, but might be used elsewhere.
// For trip creation, Firestore will generate the ID.
import { useAuth } from '@/context/AuthContext';
import { signOutUser } from '@/firebase/auth';
import { useRouter } from 'next/navigation';
import UserAvatar from '@/components/auth/UserAvatar';
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore";


const fetchTripsFromFirestore = async (userId: string | undefined): Promise<Trip[]> => {
  if (!userId) return [];
  try {
    const tripsCollectionRef = collection(db, "trips");
    const q = query(tripsCollectionRef, where("userId", "==", userId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const fetchedTrips: Trip[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Ensure all required fields are present and correctly typed
      const trip: Trip = {
        id: doc.id,
        userId: data.userId,
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        coverImageUrl: data.coverImageUrl,
        tripType: data.tripType,
        tripStyle: data.tripStyle,
        familia: data.familia, // Keep if used
        collaborators: data.collaborators, // Keep if used
        // Convert Firestore Timestamps to ISO strings
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date(data.createdAt || Date.now()).toISOString(),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : new Date(data.updatedAt || Date.now()).toISOString(),
      };
      fetchedTrips.push(trip);
    });
    return fetchedTrips;
  } catch (error) {
    console.error("Error fetching trips from Firestore:", error);
    return []; // Return empty array on error
  }
};


interface TripCardProps {
  trip: Trip;
  onRequestDelete: (tripId: string) => void;
}

function TripCard({ trip, onRequestDelete }: TripCardProps) {
  const tripIsPast = isPast(parseISO(trip.endDate));
  const router = useRouter();
  const { toast } = useToast();

  const handleCardClick = () => {
    if (tripIsPast) {
       toast({ title: "Resumen del Viaje", description: "Funcionalidad de resumen post-viaje próximamente."});
    } else {
      router.push(`/trips/${trip.id}/dashboard`);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click event
    onRequestDelete(trip.id);
  };

  return (
    <Card 
        className={`relative overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 h-full flex flex-col rounded-xl group ${tripIsPast ? 'opacity-70 hover:opacity-90' : 'cursor-pointer'}`}
        onClick={!tripIsPast ? handleCardClick : undefined}
    >
      {trip.coverImageUrl ? (
        <div className="relative w-full h-48">
          <Image
            src={trip.coverImageUrl}
            alt={`Cover image for ${trip.name}`}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            data-ai-hint={(trip as any).dataAiHint || "travel destination"}
          />
        </div>
      ) : (
        <div className="w-full h-48 bg-muted flex items-center justify-center" data-ai-hint="travel placeholder">
          <span className="text-muted-foreground">Sin imagen de portada</span>
        </div>
      )}
      <CardHeader className="flex-grow">
        <CardTitle className="text-xl font-headline group-hover:text-primary">{trip.name}</CardTitle>
        <CardDescription className="text-sm">
          {format(parseISO(trip.startDate), "d MMM yyyy", { locale: es })} - {format(parseISO(trip.endDate), "d MMM yyyy", { locale: es })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
            <div>
                <Badge variant="outline" className="mr-2 capitalize text-xs">{trip.tripType.toLowerCase()}</Badge>
                <Badge variant="secondary" className="capitalize text-xs">{trip.tripStyle.toLowerCase()}</Badge>
            </div>
            {tripIsPast && (
                 <Badge variant="destructive" className="text-xs">Finalizado</Badge>
            )}
        </div>
      </CardContent>
      <Button 
        variant="destructive" 
        size="icon" 
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 z-10 h-8 w-8"
        onClick={handleDeleteClick}
        aria-label="Eliminar viaje"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </Card>
  );
}

export default function MyTripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const { currentUser } = useAuth(); 
  const router = useRouter();
  const { toast } = useToast(); 

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [tripToDeleteId, setTripToDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const loadTrips = async () => {
      if (!currentUser) { 
        setIsLoading(false);
        setTrips([]); // Clear trips if no user
        return;
      }
      setIsLoading(true);
      const fetchedTrips = await fetchTripsFromFirestore(currentUser.uid);
      setTrips(fetchedTrips);
      setIsLoading(false);
    };
    loadTrips();
  }, [currentUser]); 


  const handleTripCreated = async (newTripData: Omit<Trip, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Error", description: "Debes iniciar sesión para crear un viaje." });
      return;
    }
    if (currentUser.subscription?.status === 'free' && trips.length >= (currentUser.subscription.maxTrips || 1) ) {
        toast({
            variant: "destructive",
            title: "Límite Alcanzado",
            description: "Has alcanzado el límite de viajes para el plan gratuito. ¡Actualiza a Pro para crear más!",
            action: (<Button onClick={() => router.push('/subscription')}>Ver Planes</Button>)
        });
        setIsWizardOpen(false);
        return;
    }

    const tripToSaveInFirestore = {
      ...newTripData, // name, startDate, endDate, coverImageUrl, tripType, tripStyle, collaborators
      userId: currentUser.uid, 
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      const docRef = await addDoc(collection(db, "trips"), tripToSaveInFirestore);
      // Re-fetch trips to update the list with the actual data from Firestore
      const updatedTrips = await fetchTripsFromFirestore(currentUser.uid);
      setTrips(updatedTrips);
      setIsWizardOpen(false);
      router.push(`/trips/${docRef.id}/dashboard`);
      toast({ title: "¡Viaje Creado!", description: `"${newTripData.name}" se ha guardado.`});
    } catch (error: any) {
        console.error("Error creating trip in Firestore:", error);
        toast({ variant: "destructive", title: "Error al Crear Viaje", description: `No se pudo guardar el viaje: ${error.message}` });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      toast({ title: 'Sesión Cerrada', description: 'Has cerrado sesión correctamente.' });
      router.push('/login'); 
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo cerrar sesión.' });
    }
  };

  const requestDeleteTrip = (tripId: string) => {
    setTripToDeleteId(tripId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!tripToDeleteId || !currentUser) return;

    const tripBeingDeleted = trips.find(t => t.id === tripToDeleteId);
    if (!tripBeingDeleted) return;

    try {
        await deleteDoc(doc(db, "trips", tripToDeleteId));
        const updatedTrips = trips.filter(trip => trip.id !== tripToDeleteId);
        setTrips(updatedTrips); // Optimistic update
        
        toast({
          title: "Viaje Eliminado",
          description: `El viaje "${tripBeingDeleted.name}" ha sido eliminado.`,
        });
    } catch (error: any) {
        console.error("Error deleting trip from Firestore:", error);
        toast({ variant: "destructive", title: "Error al Eliminar", description: `No se pudo eliminar el viaje: ${error.message}` });
    } finally {
        setIsDeleteDialogOpen(false);
        setTripToDeleteId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
             {currentUser && <UserAvatar user={currentUser} />}
            <h1 className="text-2xl font-bold font-headline text-primary">
              {currentUser ? `${currentUser.displayName?.split(' ')[0]}'s Viajes` : 'Mis Viajes'}
            </h1>
          </div>
          {currentUser && (
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Cerrar Sesión">
              <LogOut className="h-5 w-5" />
            </Button>
          )}
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="rounded-xl shadow-lg">
                <div className="w-full h-48 bg-muted animate-pulse"></div>
                <CardHeader>
                  <div className="h-6 bg-muted animate-pulse rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-1/2"></div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center h-[60vh]">
            <h2 className="text-2xl font-semibold text-foreground mb-3">¡Bienvenido/a!</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Parece que aún no has planeado ningún viaje. ¡Empecemos la aventura!
            </p>
            <Button size="lg" onClick={() => setIsWizardOpen(true)} disabled={!currentUser}>
              <Plus className="mr-2 h-5 w-5" />
              Crear mi Primer Viaje
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} onRequestDelete={requestDeleteTrip} />
            ))}
          </div>
        )}

        <Button
          className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-xl z-50"
          size="icon"
          onClick={() => setIsWizardOpen(true)}
          aria-label="Crear Nuevo Viaje"
          disabled={!currentUser} 
        >
          <Plus className="h-8 w-8" />
        </Button>
      </main>
      {currentUser && ( 
        <CreateTripWizard
            isOpen={isWizardOpen}
            onClose={() => setIsWizardOpen(false)}
            onTripCreated={handleTripCreated}
        />
      )}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-destructive" />
              ¿Estás seguro de eliminar este viaje?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el viaje
              "{trips.find(t => t.id === tripToDeleteId)?.name || 'seleccionado'}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTripToDeleteId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Eliminar Viaje
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    