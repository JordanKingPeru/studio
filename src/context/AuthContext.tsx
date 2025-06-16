
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot, type DocumentSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile, AuthContextType } from '@/lib/types';
import { Loader2 } from 'lucide-react';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true); // For initial auth state check
  const [isFetchingProfile, setIsFetchingProfile] = useState(false); // For Firestore profile fetch

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true); // Reset loading for auth change
      setIsFetchingProfile(true);

      if (firebaseUser) {
        // User is signed in, now fetch/listen to profile from Firestore
        const userRef = doc(db, "users", firebaseUser.uid);
        
        const unsubscribeProfile = onSnapshot(userRef, (docSnap: DocumentSnapshot) => {
          if (docSnap.exists()) {
            const profileData = docSnap.data();
            setCurrentUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || profileData.displayName,
              photoURL: firebaseUser.photoURL || profileData.photoURL,
              emailVerified: firebaseUser.emailVerified,
              createdAt: profileData.createdAt?.toDate?.().toISOString() || new Date().toISOString(), // Fallback for new users before CF runs
              subscription: profileData.subscription || { // Fallback if CF hasn't run yet
                status: 'free',
                plan: 'free_tier',
                tripsCreated: 0,
                maxTrips: 1,
              },
            });
          } else {
            // Profile doesn't exist yet, might be a new user before Cloud Function runs.
            // Set a basic profile, Cloud Function will create the full one.
            console.warn(`Profile for user ${firebaseUser.uid} not found in Firestore. Using basic data. Cloud Function should create it.`);
            setCurrentUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              emailVerified: firebaseUser.emailVerified,
              subscription: {
                status: 'free',
                plan: 'free_tier',
                tripsCreated: 0,
                maxTrips: 1,
              },
            });
          }
          setIsFetchingProfile(false);
          setLoading(false); // Auth check and profile fetch (attempt) done
        }, (error) => {
          console.error("Error listening to user profile:", error);
          setCurrentUser(null); // Or handle error state appropriately
          setIsFetchingProfile(false);
          setLoading(false);
        });
        
        // Return the profile unsubscribe function to clean up listener on auth state change or component unmount
        return () => unsubscribeProfile();

      } else {
        // User is signed out
        setCurrentUser(null);
        setIsFetchingProfile(false);
        setLoading(false); // Auth check done
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribeAuth();
  }, []);

  // Global loading can be a combination of initial auth check and profile fetching
  const globalLoading = loading || (auth.currentUser && isFetchingProfile && !currentUser);


  if (globalLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ currentUser, loading: globalLoading, isFetchingProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
