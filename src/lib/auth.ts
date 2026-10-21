"use client";

import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useSyncExternalStore } from "react";
import { auth, db } from "./firebase";

/**
 * Firebase Auth session plus the user's role, read from Firestore `users/{uid}`.
 * New accounts are always created as students; only an admin can change a role,
 * and firestore.rules enforces that on the server.
 */
export const roles = ["admin", "mentor", "student"] as const;
export type Role = (typeof roles)[number];

export type AppUser = { uid: string; name: string; email: string; role: Role };

/** Where each role lands after logging in. */
export const homeFor: Record<Role, string> = {
  admin: "/admin",
  mentor: "/mentor",
  student: "/dashboard",
};

export const roleLabel: Record<Role, string> = { admin: "Admin", mentor: "Mentor", student: "Student" };

type State = { user: AppUser | null; ready: boolean };

const serverState: State = { user: null, ready: false };
let state: State = serverState;
const listeners = new Set<() => void>();
let started = false;

// Details from the registration form, written into the profile when the new account first signs in.
let pendingProfile: { name: string; phone?: string } | null = null;

function setState(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

async function loadProfile(user: User): Promise<AppUser> {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  const email = user.email ?? "";

  if (!snap.exists()) {
    const name = pendingProfile?.name || user.displayName || nameFromEmail(email);
    await setDoc(ref, {
      name,
      email,
      ...(pendingProfile?.phone ? { phone: pendingProfile.phone } : {}),
      role: "student",
      createdAt: serverTimestamp(),
    });
    pendingProfile = null;
    return { uid: user.uid, name, email, role: "student" };
  }

  const data = snap.data();
  const role: Role = roles.includes(data.role) ? data.role : "student";
  return { uid: user.uid, name: data.name || nameFromEmail(email), email, role };
}

function start() {
  if (started) return;
  started = true;
  onAuthStateChanged(auth, async (user) => {
    if (!user) return setState({ user: null, ready: true });
    try {
      setState({ user: await loadProfile(user), ready: true });
    } catch (err) {
      // Without a profile we can't tell the role, so treat the session as signed out.
      console.error("Could not load user profile", err);
      setState({ user: null, ready: true });
    }
  });
}

function subscribe(onChange: () => void) {
  start();
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** `ready` is false during server render and until Firebase has restored the session. */
export function useAuth(): State {
  return useSyncExternalStore(subscribe, () => state, () => serverState);
}

export async function signIn(email: string, password: string, remember: boolean): Promise<AppUser> {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return loadProfile(user);
}

export async function register(details: { name: string; email: string; phone?: string; password: string }) {
  pendingProfile = { name: details.name, phone: details.phone };
  try {
    await createUserWithEmailAndPassword(auth, details.email, details.password);
  } catch (err) {
    pendingProfile = null;
    throw err;
  }
}

export function signOut() {
  return firebaseSignOut(auth);
}

/** Turns a Firebase Auth error into a message a learner can act on. */
export function authErrorMessage(err: unknown) {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try logging in instead.";
    case "auth/weak-password":
      return "Please choose a stronger password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

/** "priya.nair@mail.com" → "Priya Nair" */
export function nameFromEmail(email: string) {
  return email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}
