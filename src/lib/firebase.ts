
// src/lib/firebase.ts
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// INSTRUCCIONES:
// 1. Ve a tu proyecto en la Consola de Firebase (https://console.firebase.google.com/).
// 2. Entra en "Configuración del proyecto" (el ícono de engranaje).
// 3. En la sección "Tus apps", selecciona tu aplicación web o añade una nueva.
// 4. Busca el objeto de configuración del SDK de Firebase (firebaseConfig).
// 5. Copia los valores correspondientes y pégalos aquí abajo, reemplazando los marcadores.

const firebaseConfig = {
  apiKey: "AIzaSyBpmqOdoAl98RR4c1yQbTPUdPj6s4yYWvE",
  authDomain: "family-trip-planner-3qp79.firebaseapp.com",
  projectId: "family-trip-planner-3qp79",
  storageBucket: "family-trip-planner-3qp79.firebasestorage.app",
  messagingSenderId: "692025766813",
  appId: "1:692025766813:web:f8600533efdfc07ee13574"
};

// Initialize Firebase
let app: FirebaseApp;
let db: Firestore;
let storage: FirebaseStorage;

try {
  // Verifica que no se esté intentando inicializar con los placeholders
  if (firebaseConfig.apiKey === "YOUR_API_KEY") {
    console.warn(
      "Firebase no está configurado. Por favor, actualiza firebaseConfig en src/lib/firebase.ts con los detalles de tu proyecto."
    );
    // Podrías lanzar un error aquí o manejarlo de otra forma si prefieres
    // throw new Error("Firebase no configurado. Revisa src/lib/firebase.ts");
  }

  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  storage = getStorage(app);
  console.log("Firebase initialized (or attempted to initialize).");

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

} catch (error: any) {
  console.error("Error initializing Firebase:", error.message);
  // Alerta al usuario si sigue usando la configuración por defecto,
  // especialmente si la inicialización falla por esa razón.
  if (firebaseConfig.apiKey === "YOUR_API_KEY") {
    alert("Error: Firebase no está configurado. Por favor, actualiza firebaseConfig en src/lib/firebase.ts con los detalles de tu proyecto para habilitar funcionalidades como la subida de archivos.");
  }
  // Considera si quieres relanzar el error o manejarlo de forma diferente
  // throw new Error(`Firebase initialization failed: ${error.message}. Please check your firebaseConfig in src/lib/firebase.ts and ensure your Firebase project is set up correctly for web apps, including enabling Firebase Storage.`);
}


export { app, db, storage };
