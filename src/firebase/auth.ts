
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  updateProfile as firebaseUpdateProfile,
  type UserCredential,
  type User as FirebaseUserType,
} from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Use the initialized auth instance

export const signUpWithEmail = async (name: string, email: string, pass: string): Promise<UserCredential> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  if (userCredential.user) {
    await firebaseUpdateProfile(userCredential.user, { displayName: name });
  }
  return userCredential;
};

export const signInWithEmail = async (email: string, pass: string): Promise<UserCredential> => {
  return signInWithEmailAndPassword(auth, email, pass);
};

export const signInWithGoogle = async (): Promise<UserCredential> => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

export const signOutUser = async (): Promise<void> => {
  return signOut(auth);
};

export const sendPasswordReset = async (email: string): Promise<void> => {
  return firebaseSendPasswordResetEmail(auth, email);
};

// Helper to get the current Firebase user object if needed outside context/onAuthStateChanged
export const getCurrentFirebaseUser = (): FirebaseUserType | null => {
  return auth.currentUser;
};
