
// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (!getApps().length) {
  try {
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      throw new Error("Firebase apiKey o projectId no están definidos en las variables de entorno. Asegúrate de que NEXT_PUBLIC_FIREBASE_API_KEY y NEXT_PUBLIC_FIREBASE_PROJECT_ID estén configurados.");
    }
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    console.log("Firebase initialized.");
  } catch (error: any) {
    console.error("Firebase Init Error:", error.message, "Full Error:", error);
    const isInvalidApiKeyError = error.code === 'auth/invalid-api-key' || (error.message && error.message.includes('auth/invalid-api-key'));
    const isMissingConfig = error.message.includes("apiKey o projectId no están definidos");

    // Log detailed errors to the console for developers.
    // User-facing errors for critical setup issues should be handled via UI elements if possible,
    // not with `alert()` which can break SSR/builds.
    if (isMissingConfig || firebaseConfig.apiKey === "YOUR_API_KEY" || !firebaseConfig.apiKey) {
      console.error("ERROR DE CONFIGURACIÓN DE FIREBASE:\n\nLas variables de entorno para Firebase (como NEXT_PUBLIC_FIREBASE_API_KEY y NEXT_PUBLIC_FIREBASE_PROJECT_ID) parecen no estar configuradas o están vacías. Por favor, revisa tu archivo .env (o .env.local) y asegúrate de que las variables de entorno de Firebase estén correctamente definidas con los valores de tu proyecto de Firebase.\n\nDetalle del error: " + error.message);
    } else if (isInvalidApiKeyError) {
      console.error("ERROR DE CLAVE DE API DE FIREBASE:\n\nLa API Key de Firebase proporcionada (NEXT_PUBLIC_FIREBASE_API_KEY) no es válida. Verifica que el valor en tu archivo .env (o .env.local) sea correcto y corresponda a una aplicación web habilitada en tu proyecto de Firebase.\n\nDetalle del error: " + error.message);
    } else {
      console.error("ERROR AL INICIALIZAR FIREBASE:\n\nOcurrió un error desconocido durante la inicialización de Firebase. Revisa la consola del navegador para más detalles.\n\nDetalle del error: " + error.message);
    }
    // It's generally better to let the app try to proceed and handle errors gracefully via UI
    // rather than using `alert()` which blocks execution and isn't SSR-friendly.
    // If Firebase init fails, other parts of the app relying on it will likely fail too,
    // which should be caught by their respective error handling or by the AuthContext loader.
  }
} else {
  app = getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

// Ensure exports are defined even if initialization fails, to prevent further import errors.
// Components using these should handle potential undefined/uninitialized states.
export { app, auth, db, storage };
