import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

// Firebase configuration for Nuels
export const firebaseConfig = {
  apiKey: "AIzaSyC6IA6X24f0U4qAvcqzisYdo4sj1HS_-PI",
  authDomain: "nuelsmart-fb72e.firebaseapp.com",
  projectId: "nuelsmart-fb72e",
  storageBucket: "nuelsmart-fb72e.firebasestorage.app",
  messagingSenderId: "694468169123",
  appId: "1:694468169123:web:60a995f74f74ce46a1de16",
  measurementId: "G-82DHMY1DL5"
};

// Reuse the app across hot reloads instead of initialising twice.
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
// Cloud Functions live next to the Firestore data in Mumbai.
export const functions = getFunctions(app, "asia-south1");

// NEXT_PUBLIC_USE_EMULATORS=1 points the app at the local Firebase emulators (for testing).
if (process.env.NEXT_PUBLIC_USE_EMULATORS === "1") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", Number(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT ?? 8085));
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}
