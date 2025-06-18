
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot, type DocumentSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile, AuthContextType, SubscriptionPlanId, SubscriptionStatus } from '@/lib/types';
import { Loader2 } from 'lucide-react';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true); // For initial auth state check
  const [isFetchingProfile, setIsFetchingProfile] = useState(false); // For Firestore profile fetch

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true); 
      setIsFetchingProfile(true);

      if (firebaseUser) {
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
              createdAt: profileData.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
              subscription: profileData.subscription || { 
                planId: 'free_tier' as SubscriptionPlanId,
                status: 'free' as SubscriptionStatus,
                tripsCreated: 0,
                maxTrips: 1, // Default for free tier
                renewalDate: null,
              },
            });
          } else {
            console.warn(`Profile for user ${firebaseUser.uid} not found in Firestore. Using basic data. Cloud Function should create it.`);
            setCurrentUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              emailVerified: firebaseUser.emailVerified,
              createdAt: new Date().toISOString(), // Fallback
              subscription: {
                planId: 'free_tier' as SubscriptionPlanId,
                status: 'free' as SubscriptionStatus,
                tripsCreated: 0,
                maxTrips: 1, // Default for free tier
                renewalDate: null,
              },
            });
          }
          setIsFetchingProfile(false);
          setLoading(false); 
        }, (error) => {
          console.error("Error listening to user profile:", error);
          setCurrentUser(null); 
          setIsFetchingProfile(false);
          setLoading(false);
        });
        
        return () => unsubscribeProfile();

      } else {
        setCurrentUser(null);
        setIsFetchingProfile(false);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

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

