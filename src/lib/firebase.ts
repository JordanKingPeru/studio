
// src/lib/firebase.ts
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// TODO: Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID" // Optional
};

// Initialize Firebase
let app: FirebaseApp;
let db: Firestore;
let storage: FirebaseStorage;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  storage = getStorage(app);
  console.log("Firebase initialized successfully.");

  // TODO: Habilitar persistencia offline (Tarea 3.3) si es necesario aquí
  // enableIndexedDbPersistence(db)
  //   .catch((err) => {
  //     if (err.code == 'failed-precondition') {
  //       // Multiple tabs open, persistence can only be enabled
  //       // in one tab at a a time.
  //       console.warn('Firebase persistence failed: multiple tabs open.');
  //     } else if (err.code == 'unimplemented') {
  //       // The current browser does not support all of the
  //       // features required to enable persistence
  //       console.warn('Firebase persistence failed: browser does not support required features.');
  //     }
  //   });

} catch (error) {
  console.error("Error initializing Firebase:", error);
  // Handle initialization error, maybe show a message to the user
  // or fallback to a non-Firebase mode if applicable.
  // For this app, we'll throw to make it clear setup is needed.
  if (firebaseConfig.apiKey === "YOUR_API_KEY") {
    alert("Error: Firebase is not configured. Please update firebaseConfig in src/lib/firebase.ts with your project details.");
  }
  throw new Error("Firebase initialization failed. Please check your firebaseConfig in src/lib/firebase.ts and ensure your Firebase project is set up correctly for web apps, including enabling Firebase Storage.");
}


export { app, db, storage };
