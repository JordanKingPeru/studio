
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, LogOut, Trash2, AlertTriangle } from 'lucide-react'; // Added Trash2, AlertTriangle
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import CreateTripWizard from '@/components/trips/CreateTripWizard';
import type { Trip } from '@/lib/types';
import { TripType, TripStyle } from '@/lib/types';
import { format, parseISO, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { v4 as uuidv4 } from 'uuid';
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
} from "@/components/ui/alert-dialog"; // Added AlertDialog imports

// Mock API call - adjust for userId filtering
const fetchTrips = async (userId: string | undefined): Promise<Trip[]> => {
  if (!userId) return []; // No trips if no user
  await new Promise(resolve => setTimeout(resolve, 500));
  if (typeof window !== 'undefined') {
    const allStoredTrips = localStorage.getItem('familyTrips');
    if (allStoredTrips) {
      const parsedTrips: Trip[] = JSON.parse(allStoredTrips);
      // Filter trips by userId
      return parsedTrips.filter(trip => trip.userId === userId);
    }
  }
  return []; // Default to empty if nothing in localStorage or no userId
};

const saveTripsToLocalStorage = (trips: Trip[], userId: string | undefined) => {
  if (typeof window !== 'undefined' && userId) {
    const allStoredTripsJSON = localStorage.getItem('familyTrips');
    let allStoredTrips: Trip[] = [];
    if (allStoredTripsJSON) {
        allStoredTrips = JSON.parse(allStoredTripsJSON);
    }
    // Remove old trips for this user
    const otherUserTrips = allStoredTrips.filter(t => t.userId !== userId);
    // Add new/updated trips for this user
    const updatedUserTrips = [...otherUserTrips, ...trips];
    localStorage.setItem('familyTrips', JSON.stringify(updatedUserTrips));
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
        onClick={!tripIsPast ? handleCardClick : undefined} // Only allow click if not past, or let button handle it
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
        return;
      }
      setIsLoading(true);
      const fetchedTrips = await fetchTrips(currentUser.uid);
      setTrips(fetchedTrips);
      setIsLoading(false);
    };
    loadTrips();
  }, [currentUser]); 


  const handleTripCreated = (newTripData: Omit<Trip, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
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

    const newTrip: Trip = {
      ...newTripData,
      id: uuidv4(),
      userId: currentUser.uid, 
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updatedTrips = [...trips, newTrip];
    setTrips(updatedTrips);
    saveTripsToLocalStorage(updatedTrips, currentUser.uid);
    setIsWizardOpen(false);
    router.push(`/trips/${newTrip.id}/dashboard`);
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

  const handleConfirmDelete = () => {
    if (!tripToDeleteId || !currentUser) return;

    const tripBeingDeleted = trips.find(t => t.id === tripToDeleteId);
    if (!tripBeingDeleted) return;

    const updatedTrips = trips.filter(trip => trip.id !== tripToDeleteId);
    setTrips(updatedTrips);
    saveTripsToLocalStorage(updatedTrips, currentUser.uid);
    
    toast({
      title: "Viaje Eliminado",
      description: `El viaje "${tripBeingDeleted.name}" ha sido eliminado.`,
    });

    setIsDeleteDialogOpen(false);
    setTripToDeleteId(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4"> {/* Added px-4 */}
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
            <Button size="lg" onClick={() => setIsWizardOpen(true)}>
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
