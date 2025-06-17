
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, LogOut, Trash2, AlertTriangle, UserPlus, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import NextImage from 'next/image'; // Renombrado para evitar conflicto
import CreateTripWizard from '@/components/trips/CreateTripWizard';
import type { Trip, CreateTripWizardData } from '@/lib/types';
import { format, parseISO, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
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
import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, arrayUnion, arrayRemove, writeBatch } from "firebase/firestore";


const fetchTripsFromFirestore = async (userId: string | undefined, userEmail: string | null | undefined): Promise<Trip[]> => {
  if (!userId) return [];
  const fetchedTripsMap = new Map<string, Trip>();

  try {
    // Trips owned by the user
    const ownedTripsRef = collection(db, "trips");
    const qOwned = query(ownedTripsRef, where("ownerUid", "==", userId), orderBy("createdAt", "desc"));
    const ownedSnapshot = await getDocs(qOwned);
    ownedSnapshot.forEach((doc) => {
      const data = doc.data();
      fetchedTripsMap.set(doc.id, {
        id: doc.id,
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
      } as Trip);
    });

    // Trips where the user is an editor
    const editorTripsRef = collection(db, "trips");
    const qEditor = query(editorTripsRef, where("editorUids", "array-contains", userId), orderBy("createdAt", "desc"));
    const editorSnapshot = await getDocs(qEditor);
    editorSnapshot.forEach((doc) => {
      if (!fetchedTripsMap.has(doc.id)) {
        const data = doc.data();
        fetchedTripsMap.set(doc.id, {
          id: doc.id,
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
        } as Trip);
      }
    });

    // Trips where the user has a pending invitation (and email is available)
    if (userEmail) {
      const invitedTripsRef = collection(db, "trips");
      const qInvited = query(invitedTripsRef, where("pendingInvites", "array-contains", userEmail), orderBy("createdAt", "desc"));
      const invitedSnapshot = await getDocs(qInvited);
      invitedSnapshot.forEach((doc) => {
         if (!fetchedTripsMap.has(doc.id)) {
          const data = doc.data();
          // Only add if user is not already owner or editor
          if (data.ownerUid !== userId && !(data.editorUids || []).includes(userId)) {
            fetchedTripsMap.set(doc.id, {
              id: doc.id,
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
            } as Trip);
          }
        }
      });
    }
    const allTrips = Array.from(fetchedTripsMap.values());
    // Sort all combined trips by creation date as a final step
    allTrips.sort((a, b) => parseISO(b.createdAt.toString()).getTime() - parseISO(a.createdAt.toString()).getTime());
    return allTrips;

  } catch (error) {
    console.error("Error fetching trips from Firestore:", error);
    return [];
  }
};


interface TripCardProps {
  trip: Trip;
  currentUser: UserProfile | null;
  onRequestDelete: (tripId: string) => void;
  onAcceptInvitation: (tripId: string) => void;
}

function TripCard({ trip, currentUser, onRequestDelete, onAcceptInvitation }: TripCardProps) {
  const tripIsPast = isPast(parseISO(trip.endDate));
  const router = useRouter();
  const { toast } = useToast();

  const isOwner = currentUser?.uid === trip.ownerUid;
  const isEditor = trip.editorUids?.includes(currentUser?.uid || "") || false;
  const isPendingInvite = trip.pendingInvites?.includes(currentUser?.email || "") && !isOwner && !isEditor;

  const handleCardClick = () => {
    if (isPendingInvite) {
      // Potentially show a modal or a toast asking to accept first
      toast({ title: "Invitación Pendiente", description: "Por favor, acepta la invitación para acceder a este viaje."});
      return;
    }
    if (tripIsPast) {
       toast({ title: "Resumen del Viaje", description: "Funcionalidad de resumen post-viaje próximamente."});
    } else {
      router.push(`/trips/${trip.id}/dashboard`);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRequestDelete(trip.id);
  };

  return (
    <Card
        className={`relative overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 h-full flex flex-col rounded-xl group ${tripIsPast ? 'opacity-70 hover:opacity-90' : ''} ${isPendingInvite ? 'border-accent border-2' : 'cursor-pointer'}`}
        onClick={handleCardClick}
    >
      {trip.coverImageUrl ? (
        <div className="relative w-full h-48">
          <NextImage
            src={trip.coverImageUrl}
            alt={`Cover image for ${trip.name}`}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={true} // Consider making this conditional if many cards
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
      <CardContent className="pb-3">
        <div className="flex justify-between items-center">
            <div>
                <Badge variant="outline" className="mr-2 capitalize text-xs">{trip.tripType.toLowerCase()}</Badge>
                <Badge variant="secondary" className="capitalize text-xs">{trip.tripStyle.toLowerCase()}</Badge>
            </div>
            {tripIsPast && !isPendingInvite && (
                 <Badge variant="destructive" className="text-xs">Finalizado</Badge>
            )}
            {isPendingInvite && (
                <Badge variant="outline" className="text-xs border-accent text-accent animate-pulse">Invitación</Badge>
            )}
        </div>
      </CardContent>
      {isPendingInvite && (
          <CardFooter className="p-3 border-t">
            <Button onClick={(e) => { e.stopPropagation(); onAcceptInvitation(trip.id); }} className="w-full bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle className="mr-2 h-4 w-4" />
                Aceptar Invitación
            </Button>
          </CardFooter>
      )}
      {isOwner && !isPendingInvite && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 z-10 h-8 w-8"
          onClick={handleDeleteClick}
          aria-label="Eliminar viaje"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
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

  const loadTrips = async () => {
    if (!currentUser) {
      setIsLoading(false);
      setTrips([]);
      return;
    }
    setIsLoading(true);
    const fetchedTrips = await fetchTripsFromFirestore(currentUser.uid, currentUser.email);
    setTrips(fetchedTrips);
    setIsLoading(false);
  };

  useEffect(() => {
    loadTrips();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);


  const handleTripCreated = async (wizardData: CreateTripWizardData) => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Error", description: "Debes iniciar sesión para crear un viaje." });
      return;
    }
    if (currentUser.subscription?.status === 'free' && trips.filter(t => t.ownerUid === currentUser.uid).length >= (currentUser.subscription.maxTrips || 1) ) {
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
      name: wizardData.name,
      startDate: wizardData.startDate,
      endDate: wizardData.endDate,
      coverImageUrl: wizardData.coverImageUrl || '',
      tripType: wizardData.tripType,
      tripStyle: wizardData.tripStyle,
      ownerUid: currentUser.uid,
      editorUids: [],
      pendingInvites: wizardData.pendingInvites || [],
      familia: `${wizardData.numAdults || 0} Adultos, ${wizardData.numChildren || 0} Niños`, // Example familia string
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      const docRef = await addDoc(collection(db, "trips"), tripToSaveInFirestore);
      await loadTrips(); // Re-fetch trips
      setIsWizardOpen(false);
      router.push(`/trips/${docRef.id}/map`);
      toast({ title: "¡Viaje Creado!", description: `"${wizardData.name}" se ha guardado. Añade tus destinos en el mapa.`});
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
    if (!tripBeingDeleted || tripBeingDeleted.ownerUid !== currentUser.uid) {
        toast({ variant: "destructive", title: "No Autorizado", description: "Solo el propietario puede eliminar el viaje." });
        setIsDeleteDialogOpen(false);
        return;
    }

    try {
        // Before deleting the trip, delete its subcollections if any.
        // This is important for data cleanup and to avoid orphaned data.
        const subcollectionsToDelete = ["activities", "cities", "expenses"];
        const batch = writeBatch(db);

        for (const subcollectionName of subcollectionsToDelete) {
            const subcollectionRef = collection(db, "trips", tripToDeleteId, subcollectionName);
            const snapshot = await getDocs(subcollectionRef);
            snapshot.docs.forEach(docSnap => {
                batch.delete(docSnap.ref);
            });
        }
        // Delete the main trip document
        batch.delete(doc(db, "trips", tripToDeleteId));
        await batch.commit();

        setTrips(prevTrips => prevTrips.filter(trip => trip.id !== tripToDeleteId));
        toast({
          title: "Viaje Eliminado",
          description: `El viaje "${tripBeingDeleted.name}" y todos sus datos han sido eliminados.`,
        });
    } catch (error: any) {
        console.error("Error deleting trip from Firestore:", error);
        toast({ variant: "destructive", title: "Error al Eliminar", description: `No se pudo eliminar el viaje: ${error.message}` });
    } finally {
        setIsDeleteDialogOpen(false);
        setTripToDeleteId(null);
    }
  };

  const handleAcceptInvitation = async (tripId: string) => {
    if (!currentUser || !currentUser.email) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo identificar al usuario." });
        return;
    }
    const tripRef = doc(db, "trips", tripId);
    try {
        await updateDoc(tripRef, {
            editorUids: arrayUnion(currentUser.uid),
            pendingInvites: arrayRemove(currentUser.email)
        });
        toast({ title: "Invitación Aceptada", description: "¡Ahora eres colaborador de este viaje!" });
        await loadTrips(); // Refresh the list of trips
    } catch (error: any) {
        console.error("Error accepting invitation:", error);
        toast({ variant: "destructive", title: "Error al Aceptar", description: `No se pudo aceptar la invitación: ${error.message}` });
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
              Parece que aún no has planeado ningún viaje o no tienes invitaciones pendientes. ¡Empecemos la aventura!
            </p>
            <Button size="lg" onClick={() => setIsWizardOpen(true)} disabled={!currentUser}>
              <Plus className="mr-2 h-5 w-5" />
              Crear mi Primer Viaje
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                currentUser={currentUser}
                onRequestDelete={requestDeleteTrip}
                onAcceptInvitation={handleAcceptInvitation}
              />
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
              "{trips.find(t => t.id === tripToDeleteId)?.name || 'seleccionado'}" y todos sus datos asociados.
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
