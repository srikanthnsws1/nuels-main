"use client";

import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
  type User,
} from "firebase/auth";
import { deleteField, doc, getDoc, onSnapshot, runTransaction, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { useSyncExternalStore } from "react";
import { auth, db } from "./firebase";
import { groupForClass } from "@/data/dailyQuiz";
import { assertAvailable, claimIfFree, claimsFor, type Claim } from "./unique";

/**
 * Firebase Auth session plus the user's role, read from Firestore `users/{uid}`.
 * New accounts are always created as students. Instructor sign-ups are stored as
 * `requestedRole: "mentor"` until an admin approves them. Only an admin can change a
 * role, and firestore.rules enforces all of this on the server.
 */
export const roles = ["admin", "mentor", "student", "employee"] as const;
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
  /** Employees only: job title, company employee number and what they may access. */
  designation?: string;
  employeeNumber?: string;
  permissions: string[];
  phone?: string;
  /** Class / standard / course from registration (e.g. "C10", "INT-MPC"); sets the Daily Quiz pattern. */
  studyClass?: string;
  /** Daily Quiz group derived from studyClass (see src/data/quizPatterns.json). */
  quizGroup?: string;
  /** School or college name from registration. */
  institution?: string;
  /** Slugs of courses waiting in the cart. */
  cart: string[];
  /** Slugs of paid-for courses. Only payment confirmation (Cloud Function or admin) adds to this. */
  enrolledCourses: string[];
};

/** The role line under a name: an employee's designation, otherwise the role. */
export function displayRole(user: Pick<AppUser, "role" | "designation">) {
  return (user.role === "employee" && user.designation) || roleLabel[user.role];
}

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
  employee: "/staff",
  student: "/dashboard",
};

/** Dedicated login route for each role */
export const loginRouteFor: Record<Role, string> = {
  admin: "/admin/login",
  mentor: "/tutor/login",
  employee: "/login",
  student: "/login",
};

export const roleLabel: Record<Role, string> = {
  admin: "Administrator",
  mentor: "Tutor / Mentor",
  employee: "Staff member",
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
  /** Class / standard / course id from src/data/dailyQuiz.ts (learners only). */
  studyClass?: string;
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

/** A Firestore array of course slugs, ignoring anything malformed. */
const slugList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

const detailKeys = ["institution", "syllabus", "country", "state", "district", "mandal", "city", "nickname"] as const;

/**
 * Reserves a unique member ID ("S1234" / "T1234") in `memberIds/{id}` and writes it to the
 * profile in the same transaction. firestore.rules reject IDs that are taken, malformed or
 * don't match the account type. Retries on collisions.
 */
export async function withMemberId(uid: string, prefix: "S" | "T" | "E", newProfile?: Record<string, unknown>, claims: Claim[] = []): Promise<string> {
  const userRef = doc(db, "users", uid);
  for (let attempt = 0; attempt < 20; attempt++) {
    const id = prefix + String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    const outcome = await runTransaction(db, async (tx) => {
      const [idSnap, userSnap, ...claimSnaps] = await Promise.all([
        tx.get(doc(db, "memberIds", id)),
        tx.get(userRef),
        ...claims.map((c) => tx.get(doc(db, c.col, c.key))),
      ]);
      if (idSnap.exists()) return "taken";
      if (newProfile && userSnap.exists()) return "exists";
      if (!newProfile && userSnap.data()?.memberId) return "exists";
      // Name / phone registered by someone else in the meantime.
      const lost = claims.find((c, i) => claimSnaps[i].exists() && claimSnaps[i].data()?.uid !== uid);
      if (lost) return lost.col === "uniquePhones" ? "phone-taken" : lost.col === "uniqueEmails" ? "email-taken" : "name-taken";
      claims.forEach((c, i) => !claimSnaps[i].exists() && tx.set(doc(db, c.col, c.key), { uid, createdAt: serverTimestamp() }));
      tx.set(doc(db, "memberIds", id), { uid, createdAt: serverTimestamp() });
      if (newProfile) tx.set(userRef, { ...newProfile, memberId: id });
      else tx.update(userRef, { memberId: id });
      return "ok";
    });
    if (outcome === "ok") return id;
    if (outcome === "phone-taken" || outcome === "name-taken" || outcome === "email-taken") throw Object.assign(new Error(outcome), { code: `nuels/${outcome}` });
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
    const fromRegistration = !!pendingProfile;
    const name = pendingProfile?.name || user.displayName || nameFromEmail(email);
    const photo = pendingProfile?.photo || undefined;
    const details = Object.fromEntries(
      detailKeys.map((k) => [k, pendingProfile?.[k]?.trim()]).filter(([, v]) => v),
    ) as Partial<Record<(typeof detailKeys)[number], string>>;
    const studyClass = pendingProfile?.studyClass;
    const quizGroup = groupForClass(studyClass);
    const profile = {
      name,
      email,
      ...(quizGroup ? { studyClass, quizGroup } : {}),
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
      memberId = await withMemberId(user.uid, requestedRole === "mentor" ? "T" : "S", profile, fromRegistration ? claimsFor(profile) : []);
    } catch (err) {
      if (String((err as { code?: string })?.code).startsWith("nuels/")) throw err;
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
      ...(quizGroup ? { studyClass, quizGroup } : {}),
      permissions: [],
      cart: [],
      enrolledCourses: [],
    };
  }

  const data = snap.data();
  // Accounts an admin has deactivated or removed can't sign in.
  if (data.status === "inactive" || data.status === "removed") {
    await firebaseSignOut(auth);
    throw Object.assign(new Error("Account blocked"), { code: data.status === "removed" ? "nuels/account-removed" : "auth/user-disabled" });
  }
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

  // Accounts made before the duplicate checks: claim this account's name, phone and email
  // (where nobody holds them yet) so a new sign-up can't copy them.
  claimIfFree(user.uid, { name: data.name, phone: data.phone, email }).catch((err) => console.warn("Couldn't claim name / phone / email", err));

  // Accounts created before member IDs existed get one on their next login.
  let memberId: string | undefined = data.memberId;
  if (!memberId) {
    try {
      memberId = await withMemberId(user.uid, role === "employee" ? "E" : role === "mentor" || data.requestedRole === "mentor" ? "T" : "S");
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
    ...staffFields(data),
    ...quizFields(data),
    cart: slugList(data.cart),
    enrolledCourses: slugList(data.enrolledCourses),
  };
}

function quizFields(data: Record<string, unknown>) {
  return {
    studyClass: typeof data.studyClass === "string" ? data.studyClass : undefined,
    quizGroup: typeof data.quizGroup === "string" ? data.quizGroup : undefined,
    institution: typeof data.institution === "string" && data.institution ? data.institution : undefined,
  };
}

function staffFields(data: Record<string, unknown>) {
  const text = (v: unknown) => (typeof v === "string" && v ? v : undefined);
  return {
    designation: text(data.designation),
    employeeNumber: text(data.employeeNumber),
    phone: text(data.phone),
    permissions: slugList(data.permissions),
  };
}

let stopProfile: (() => void) | null = null;

/** Keeps the signed-in user's photo, name, cart and enrollments in sync with Firestore. */
function watchProfile(uid: string) {
  stopProfile?.();
  stopProfile = onSnapshot(
    doc(db, "users", uid),
    (snap) => {
      const data = snap.data();
      const current = state.user;
      if (!data || current?.uid !== uid) return;
      if (data.status === "inactive" || data.status === "removed") {
        firebaseSignOut(auth).catch(() => {});
        return;
      }
      setState({
        ready: true,
        user: {
          ...current,
          name: data.name || current.name,
          nickname: data.nickname,
          photo: data.photo,
          ...staffFields(data),
          ...quizFields(data),
          cart: slugList(data.cart),
          enrolledCourses: slugList(data.enrolledCourses),
        },
      });
    },
    (err) => console.warn("Stopped listening for profile changes", err),
  );
}

function start() {
  if (started) return;
  started = true;
  onAuthStateChanged(auth, async (user) => {
    stopProfile?.();
    stopProfile = null;
    if (!user) return setState({ user: null, ready: true });
    try {
      setState({ user: await loadProfile(user), ready: true });
      watchProfile(user.uid);
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

/** "S1234", "T1234" or "E1234": a member ID typed instead of an email. */
export const isMemberId = (value: string) => /^[STE]\d{4}$/i.test(value.trim());

/** The login email behind a member ID (`loginIds/{id}`), or null if it isn't registered. */
export async function emailForMemberId(id: string): Promise<string | null> {
  const snap = await getDoc(doc(db, "loginIds", id.trim().toUpperCase()));
  const email = snap.data()?.email;
  return typeof email === "string" && email ? email : null;
}

/** Keeps `loginIds/{memberId}` pointing at this account's email, so the member ID works as a username. */
export function syncLoginId(user: Pick<AppUser, "uid" | "email" | "memberId">) {
  if (!user.memberId || !user.email) return Promise.resolve();
  return setDoc(doc(db, "loginIds", user.memberId), { email: user.email, uid: user.uid, updatedAt: serverTimestamp() }).catch((err) =>
    console.warn("Could not save the login ID", err),
  );
}

/** Signs in with an email address or a member ID (S/T/E + 4 digits). */
export async function signIn(identifier: string, password: string, remember: boolean): Promise<AppUser> {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  let email = identifier.trim();
  if (isMemberId(email)) {
    const found = await emailForMemberId(email);
    if (!found) throw Object.assign(new Error("Unknown member ID"), { code: "nuels/unknown-id" });
    email = found;
  }
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  const profile = await loadProfile(user);
  void syncLoginId(profile);
  return profile;
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
    // One account per phone number, per name and per email (Gmail aliases count as the same email).
    await assertAvailable({ name: details.name, phone: details.phone, email: details.email });
    const { user } = await createUserWithEmailAndPassword(auth, details.email, details.password);
    // Verification proves the address belongs to them (required for admin access).
    sendEmailVerification(user).catch((err) => console.warn("Could not send verification email", err));
    let profile: AppUser;
    try {
      profile = await loadProfile(user);
    } catch (err) {
      // Lost the name / phone to a sign-up at the same moment: don't leave a half-made account.
      await user.delete().catch(() => undefined);
      throw err;
    }
    void syncLoginId(profile);
    return profile;
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

/** Re-checks the current password, then sets the new one. */
export async function changePassword(current: string, next: string) {
  const user = auth.currentUser;
  if (!user?.email) throw new Error("Not signed in");
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current));
  await updatePassword(user, next);
}

/** Saves a cropped profile picture (data URL), or removes it when `photo` is empty. */
export function updateProfilePhoto(uid: string, photo: string) {
  return updateDoc(doc(db, "users", uid), { photo: photo || deleteField() });
}

/** Turns a Firebase Auth error into a message a learner can act on. */
export function authErrorMessage(err: unknown) {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email / ID or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try logging in instead.";
    case "auth/weak-password":
      return "Please choose a stronger password.";
    case "auth/invalid-email":
    case "auth/missing-email":
      return "Please enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been deactivated. Contact your administrator or info@nuelsmart.com.";
    case "nuels/unknown-id":
      return "We couldn't find that ID. Check it, or log in with your email address.";
    case "nuels/account-removed":
      return "This account has been removed. Contact info@nuelsmart.com if you think this is a mistake.";
    case "nuels/phone-taken":
      return "An account with this phone number already exists. Log in instead, or raise a support ticket if you can't.";
    case "nuels/email-taken":
      return "An account with this email already exists. Try logging in instead.";
    case "nuels/email-typo":
      return `That email address looks mistyped. Did you mean @${(err as { suggestion?: string }).suggestion}?`;
    case "nuels/name-taken":
      return "Someone with this full name is already registered. If that's you, log in instead. Otherwise add your surname or initial.";
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
