
"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import type { Trip, UserProfile } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot, type DocumentSnapshot } from 'firebase/firestore';
import { ShieldCheck, Users, MailQuestion, UserPlus, XCircle, Loader2, Send } from 'lucide-react';
import Image from 'next/image';

interface ManageCollaboratorsCardProps {
  tripId: string;
}

interface CollaboratorInfo extends UserProfile {
  // For display purposes, UserProfile is sufficient
}

async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  if (!uid) return null;
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const data = userSnap.data();
    return {
      uid: userSnap.id,
      email: data.email,
      displayName: data.displayName || "Usuario sin nombre",
      photoURL: data.photoURL,
      emailVerified: data.emailVerified, // Keep if needed
      // subscription not directly needed here
      subscription: data.subscription || { status: 'free', plan: 'free_tier', tripsCreated: 0, maxTrips: 1 },
    } as UserProfile;
  }
  return null;
}

export default function ManageCollaboratorsCard({ tripId }: ManageCollaboratorsCardProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<CollaboratorInfo | null>(null);
  const [editorProfiles, setEditorProfiles] = useState<CollaboratorInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchAndSetCollaboratorProfiles = useCallback(async (currentTripData: Trip) => {
    if (currentTripData.ownerUid) {
      fetchUserProfile(currentTripData.ownerUid).then(setOwnerProfile);
    } else {
      setOwnerProfile(null);
    }

    if (currentTripData.editorUids && currentTripData.editorUids.length > 0) {
      Promise.all(currentTripData.editorUids.map(uid => fetchUserProfile(uid)))
        .then(profiles => setEditorProfiles(profiles.filter(p => p !== null) as CollaboratorInfo[]));
    } else {
      setEditorProfiles([]);
    }
  }, []);


  useEffect(() => {
    if (!tripId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const tripRef = doc(db, "trips", tripId);
    const unsubscribe = onSnapshot(tripRef, (docSnap: DocumentSnapshot) => {
      if (docSnap.exists()) {
        const tripData = { id: docSnap.id, ...docSnap.data() } as Trip;
        setTrip(tripData);
        fetchAndSetCollaboratorProfiles(tripData);
      } else {
        toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la información del viaje." });
        setTrip(null);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error listening to trip document:", error);
      toast({ variant: "destructive", title: "Error de Carga", description: "No se pudo obtener datos del viaje en tiempo real." });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [tripId, toast, fetchAndSetCollaboratorProfiles]);


  const isCurrentUserOwner = currentUser?.uid === trip?.ownerUid;

  const handleAddInvite = async () => {
    if (!newInviteEmail.trim() || !trip) return;
    if (!isCurrentUserOwner) {
        toast({variant: "destructive", title: "No Autorizado", description: "Solo el propietario puede invitar."});
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newInviteEmail.trim())) {
        toast({variant: "destructive", title: "Email Inválido", description: "Por favor, ingresa un email válido."});
        return;
    }
    
    if (trip.ownerUid === currentUser?.uid && newInviteEmail.trim() === currentUser?.email) {
      toast({ variant: "destructive", title: "Error", description: "No puedes invitarte a ti mismo (ya eres el propietario)." });
      return;
    }
    if (editorProfiles.some(editor => editor.email === newInviteEmail.trim())) {
      toast({ variant: "destructive", title: "Error", description: "Este usuario ya es un editor." });
      return;
    }
    if (trip.pendingInvites?.includes(newInviteEmail.trim())) {
      toast({ variant: "destructive", title: "Error", description: "Este email ya tiene una invitación pendiente." });
      return;
    }

    setIsUpdating(true);
    const tripRef = doc(db, "trips", trip.id);
    try {
      await updateDoc(tripRef, {
        pendingInvites: arrayUnion(newInviteEmail.trim())
      });
      toast({ title: "Invitación Enviada", description: `Se ha invitado a ${newInviteEmail.trim()}.` });
      setNewInviteEmail('');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al Invitar", description: error.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveEditor = async (editorUidToRemove: string) => {
    if (!trip || !isCurrentUserOwner) return;
    setIsUpdating(true);
    const tripRef = doc(db, "trips", trip.id);
    try {
      await updateDoc(tripRef, {
        editorUids: arrayRemove(editorUidToRemove)
      });
      toast({ title: "Editor Eliminado", description: "El colaborador ha sido eliminado." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al Eliminar", description: error.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRevokeInvite = async (emailToRevoke: string) => {
    if (!trip || !isCurrentUserOwner) return;
    setIsUpdating(true);
    const tripRef = doc(db, "trips", trip.id);
    try {
      await updateDoc(tripRef, {
        pendingInvites: arrayRemove(emailToRevoke)
      });
      toast({ title: "Invitación Revocada", description: `Se ha revocado la invitación para ${emailToRevoke}.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al Revocar", description: error.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    const nameParts = name.split(' ');
    if (nameParts.length > 1) {
      return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <Card className="rounded-xl shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary flex items-center">
            <Users size={22} className="mr-2" /> Gestionar Colaboradores
          </CardTitle>
          <CardDescription>Cargando información de colaboradores...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!trip) {
    return (
      <Card className="rounded-xl shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary flex items-center">
            <Users size={22} className="mr-2" /> Gestionar Colaboradores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No se pudo cargar la información del viaje o el viaje no existe.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="rounded-xl shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl text-primary flex items-center">
          <Users size={22} className="mr-2" /> Gestionar Colaboradores
        </CardTitle>
        <CardDescription>Visualiza y gestiona quién tiene acceso a este viaje.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="text-md font-semibold text-secondary-foreground mb-2 flex items-center">
            <ShieldCheck size={18} className="mr-2 text-green-500" /> Propietario
          </h4>
          {ownerProfile ? (
            <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-md">
              <Avatar className="h-9 w-9">
                {ownerProfile.photoURL ? (
                   <AvatarImage asChild src={ownerProfile.photoURL} alt={ownerProfile.displayName || 'Avatar'}>
                    <Image src={ownerProfile.photoURL} alt={ownerProfile.displayName || 'Avatar'} width={36} height={36} className="rounded-full object-cover"/>
                  </AvatarImage>
                ): null}
                <AvatarFallback>{getInitials(ownerProfile.displayName)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">{ownerProfile.displayName}</p>
                <p className="text-xs text-muted-foreground">{ownerProfile.email}</p>
              </div>
            </div>
          ) : <p className="text-sm text-muted-foreground">Cargando propietario...</p>}
        </div>

        <Separator />

        <div>
          <h4 className="text-md font-semibold text-secondary-foreground mb-2 flex items-center">
            <Users size={18} className="mr-2 text-blue-500" /> Editores ({editorProfiles.length})
          </h4>
          {editorProfiles.length > 0 ? (
            <ul className="space-y-2">
              {editorProfiles.map(editor => (
                <li key={editor.uid} className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                  <div className="flex items-center space-x-3">
                     <Avatar className="h-9 w-9">
                        {editor.photoURL ? (
                        <AvatarImage asChild src={editor.photoURL} alt={editor.displayName || 'Avatar'}>
                           <Image src={editor.photoURL} alt={editor.displayName || 'Avatar'} width={36} height={36} className="rounded-full object-cover"/>
                        </AvatarImage>
                        ): null}
                        <AvatarFallback>{getInitials(editor.displayName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">{editor.displayName}</p>
                      <p className="text-xs text-muted-foreground">{editor.email}</p>
                    </div>
                  </div>
                  {isCurrentUserOwner && currentUser?.uid !== editor.uid && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/80 hover:bg-destructive/10" disabled={isUpdating}>
                          <XCircle size={16} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Eliminar Editor</AlertDialogTitle>
                          <AlertDialogDescription>
                            ¿Seguro que quieres eliminar a {editor.displayName || editor.email} de este viaje? Perderá el acceso de edición.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isUpdating}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRemoveEditor(editor.uid)} disabled={isUpdating} className="bg-destructive hover:bg-destructive/90">
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No hay otros editores en este viaje.</p>
          )}
        </div>

        <Separator />

        <div>
          <h4 className="text-md font-semibold text-secondary-foreground mb-2 flex items-center">
            <MailQuestion size={18} className="mr-2 text-orange-500" /> Invitaciones Pendientes ({(trip.pendingInvites || []).length})
          </h4>
          {(trip.pendingInvites || []).length > 0 ? (
            <ul className="space-y-2">
              {(trip.pendingInvites || []).map(email => (
                <li key={email} className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                  <p className="text-sm text-foreground truncate max-w-[calc(100%-3rem)]" title={email}>{email}</p>
                  {isCurrentUserOwner && (
                     <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/80 hover:bg-destructive/10" disabled={isUpdating}>
                          <XCircle size={16} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Revocar Invitación</AlertDialogTitle>
                          <AlertDialogDescription>
                            ¿Seguro que quieres revocar la invitación para {email}?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isUpdating}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRevokeInvite(email)} disabled={isUpdating} className="bg-destructive hover:bg-destructive/90">
                             {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Revocar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No hay invitaciones pendientes.</p>
          )}
        </div>

        {isCurrentUserOwner && (
          <>
            <Separator />
            <div>
              <h4 className="text-md font-semibold text-secondary-foreground mb-2 flex items-center">
                <UserPlus size={18} className="mr-2 text-indigo-500" /> Invitar Nuevo Colaborador
              </h4>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={newInviteEmail}
                  onChange={(e) => setNewInviteEmail(e.target.value)}
                  disabled={isUpdating}
                  className="flex-grow"
                />
                <Button onClick={handleAddInvite} disabled={isUpdating || !newInviteEmail.trim()} className="shrink-0">
                  {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Send size={16} className="mr-2" /> Invitar
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

    