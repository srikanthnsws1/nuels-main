"use client";

import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, runTransaction, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { useSyncExternalStore } from "react";
import { auth, db } from "./firebase";

/**
 * Firebase Auth session plus the user's role, read from Firestore `users/{uid}`.
 * New accounts are always created as students. Instructor sign-ups are stored as
 * `requestedRole: "mentor"` until an admin approves them. Only an admin can change a
 * role, and firestore.rules enforces all of this on the server.
 */
export const roles = ["admin", "mentor", "student"] as const;
export type Role = (typeof roles)[number];

export type AppUser = {
  uid: string;
  name: string;
  email: string;
  role: Role;
  requestedRole?: "mentor";
  emailVerified: boolean;
  /** Public member ID: "S" + 4 digits for students, "T" + 4 digits for tutors. */
  memberId?: string;
  nickname?: string;
  /** Small JPEG data URL of the cropped profile picture. */
  photo?: string;
};

/** The name to greet someone by: their nickname, else their first name. */
export function greetingName(user: Pick<AppUser, "name" | "nickname">) {
  return user.nickname?.trim() || user.name.split(" ")[0] || "there";
}

/**
 * Bootstrap admin accounts. An address here only gets admin rights after its owner has
 * verified it, so nobody can claim admin by signing up with an unregistered address.
 * Keep this list in sync with isAdmin() in firestore.rules.
 */
export const ADMIN_EMAILS: string[] = [
  "admin@nuelsmart.com",
  "admin@nuels.com",
  "anirudhjyothula@gmail.com",
  "srikanth.nsws1@gmail.com",
];

export function isAdminEmail(email: string): boolean {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  return ADMIN_EMAILS.some((e) => e.toLowerCase() === lower);
}

/** Where each role lands after logging in. */
export const homeFor: Record<Role, string> = {
  admin: "/admin",
  mentor: "/mentor",
  student: "/dashboard",
};

/** Dedicated login route for each role */
export const loginRouteFor: Record<Role, string> = {
  admin: "/admin/login",
  mentor: "/tutor/login",
  student: "/login",
};

export const roleLabel: Record<Role, string> = {
  admin: "Administrator",
  mentor: "Tutor / Mentor",
  student: "Student / Learner",
};

type State = { user: AppUser | null; ready: boolean };

const serverState: State = { user: null, ready: false };
let state: State = serverState;
const listeners = new Set<() => void>();
let started = false;

// Details from the registration form, written into the profile when the new account first signs in.
/** Education and location details collected at registration. */
export type ProfileDetails = {
  institution?: string;
  syllabus?: string;
  country?: string;
  state?: string;
  district?: string;
  mandal?: string;
  city?: string;
  nickname?: string;
  photo?: string;
  /** Agreed to receive the welcome message (and account updates) on WhatsApp. */
  whatsappOptIn?: boolean;
};

let pendingProfile: ({ name: string; phone?: string; requestedRole?: "mentor" } & ProfileDetails) | null = null;

function setState(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

const detailKeys = ["institution", "syllabus", "country", "state", "district", "mandal", "city", "nickname"] as const;

/**
 * Reserves a unique member ID ("S1234" / "T1234") in `memberIds/{id}` and writes it to the
 * profile in the same transaction. firestore.rules reject IDs that are taken, malformed or
 * don't match the account type. Retries on collisions.
 */
async function withMemberId(uid: string, prefix: "S" | "T", newProfile?: Record<string, unknown>): Promise<string> {
  const userRef = doc(db, "users", uid);
  for (let attempt = 0; attempt < 20; attempt++) {
    const id = prefix + String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    const outcome = await runTransaction(db, async (tx) => {
      const [idSnap, userSnap] = await Promise.all([tx.get(doc(db, "memberIds", id)), tx.get(userRef)]);
      if (idSnap.exists()) return "taken";
      if (newProfile && userSnap.exists()) return "exists";
      if (!newProfile && userSnap.data()?.memberId) return "exists";
      tx.set(doc(db, "memberIds", id), { uid, createdAt: serverTimestamp() });
      if (newProfile) tx.set(userRef, { ...newProfile, memberId: id });
      else tx.update(userRef, { memberId: id });
      return "ok";
    });
    if (outcome === "ok") return id;
    if (outcome === "exists") return (await getDoc(userRef)).data()?.memberId ?? "";
  }
  throw new Error("Could not allocate a member ID");
}

const inflight = new Map<string, Promise<AppUser>>();

/** Loads (or on first sign-in, creates) the profile. Concurrent calls share one load. */
function loadProfile(user: User): Promise<AppUser> {
  const running = inflight.get(user.uid);
  if (running) return running;
  const job = loadProfileOnce(user).finally(() => inflight.delete(user.uid));
  inflight.set(user.uid, job);
  return job;
}

async function loadProfileOnce(user: User): Promise<AppUser> {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  const email = user.email ?? "";
  const isSpecialAdmin = isAdminEmail(email) && user.emailVerified;

  if (!snap.exists()) {
    const assignedRole: Role = isSpecialAdmin ? "admin" : "student";
    const requestedRole = pendingProfile?.requestedRole;
    const name = pendingProfile?.name || user.displayName || nameFromEmail(email);
    const photo = pendingProfile?.photo || undefined;
    const details = Object.fromEntries(
      detailKeys.map((k) => [k, pendingProfile?.[k]?.trim()]).filter(([, v]) => v),
    ) as Partial<Record<(typeof detailKeys)[number], string>>;
    const profile = {
      name,
      email,
      ...(pendingProfile?.phone ? { phone: pendingProfile.phone } : {}),
      // Only store the fields the learner actually filled in.
      ...details,
      ...(photo ? { photo } : {}),
      ...(pendingProfile?.whatsappOptIn ? { whatsappOptIn: true } : {}),
      ...(requestedRole ? { requestedRole } : {}),
      role: assignedRole,
      createdAt: serverTimestamp(),
    };
    pendingProfile = null;

    let memberId: string | undefined;
    try {
      memberId = await withMemberId(user.uid, requestedRole === "mentor" ? "T" : "S", profile);
    } catch (err) {
      // e.g. the new rules aren't deployed yet: still create the account, the ID follows on next login.
      console.warn("Could not assign a member ID; creating the profile without one", err);
      await setDoc(ref, profile);
    }
    return {
      uid: user.uid,
      name,
      email,
      role: assignedRole,
      requestedRole,
      emailVerified: user.emailVerified,
      memberId,
      nickname: details.nickname,
      photo,
    };
  }

  const data = snap.data();
  let role: Role = roles.includes(data.role) ? data.role : "student";

  // Auto-elevate verified bootstrap admin addresses.
  if (isSpecialAdmin && role !== "admin") {
    role = "admin";
    try {
      await updateDoc(ref, { role: "admin" });
    } catch (err) {
      console.warn("Could not auto-elevate admin role in Firestore:", err);
    }
  }

  // Accounts created before member IDs existed get one on their next login.
  let memberId: string | undefined = data.memberId;
  if (!memberId) {
    try {
      memberId = await withMemberId(user.uid, role === "mentor" || data.requestedRole === "mentor" ? "T" : "S");
    } catch (err) {
      console.warn("Could not assign a member ID", err);
    }
  }

  return {
    uid: user.uid,
    name: data.name || nameFromEmail(email),
    email,
    role,
    requestedRole: role === "student" && data.requestedRole === "mentor" ? "mentor" : undefined,
    emailVerified: user.emailVerified,
    memberId,
    nickname: data.nickname,
    photo: data.photo,
  };
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

export async function register(details: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role?: Role;
  profile?: ProfileDetails;
}): Promise<AppUser> {
  pendingProfile = {
    ...details.profile,
    name: details.name,
    phone: details.phone,
    requestedRole: details.role === "mentor" ? "mentor" : undefined,
  };
  try {
    const { user } = await createUserWithEmailAndPassword(auth, details.email, details.password);
    // Verification proves the address belongs to them (required for admin access).
    sendEmailVerification(user).catch((err) => console.warn("Could not send verification email", err));
    return loadProfile(user);
  } catch (err) {
    pendingProfile = null;
    throw err;
  }
}

export function signOut() {
  return firebaseSignOut(auth);
}

/** Emails a password-reset link. Firebase doesn't reveal whether the account exists. */
export function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email);
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
    case "auth/invalid-email":
    case "auth/missing-email":
      return "Please enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact info@nuelsmart.com for help.";
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
