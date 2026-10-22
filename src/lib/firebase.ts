import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

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
