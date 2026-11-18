"use client";

import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * One account per phone number and per full name. Each is claimed in `uniquePhones/{key}` and
 * `uniqueNames/{key}` (holding the owner's uid) when the account is created; registration checks
 * them first. Email is already unique in Firebase Auth.
 */
export const phoneKey = (phone?: string) => {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : "";
};
/** "Srikanth  Seelam" and "srikanth seelam." are the same name. */
export const nameKey = (name?: string) => (name ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 100);

export type Claim = { col: "uniquePhones" | "uniqueNames"; key: string };

export const claimsFor = (p: { name?: string; phone?: string }): Claim[] =>
  [
    { col: "uniqueNames" as const, key: nameKey(p.name) },
    { col: "uniquePhones" as const, key: phoneKey(p.phone) },
  ].filter((c) => c.key);

/** Which of name / phone already belong to another account. */
export async function takenDetails(p: { name?: string; phone?: string }, exceptUid?: string) {
  const taken = { name: false, phone: false };
  await Promise.all(
    claimsFor(p).map(async (c) => {
      const snap = await getDoc(doc(db, c.col, c.key));
      if (snap.exists() && snap.data().uid !== exceptUid) taken[c.col === "uniqueNames" ? "name" : "phone"] = true;
    }),
  );
  return taken;
}

/** Throws a coded error a form can show, when the name or phone is already registered. */
export async function assertAvailable(p: { name?: string; phone?: string }) {
  const taken = await takenDetails(p);
  if (taken.phone) throw Object.assign(new Error("Phone taken"), { code: "nuels/phone-taken" });
  if (taken.name) throw Object.assign(new Error("Name taken"), { code: "nuels/name-taken" });
}

/** Frees a removed account's name and phone so someone else can register them. */
export async function releaseClaims(uid: string, p: { name?: string; phone?: string }) {
  await Promise.all(
    claimsFor(p).map(async (c) => {
      const ref = doc(db, c.col, c.key);
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data().uid === uid) await deleteDoc(ref);
    }),
  );
}

/** Claims the name and phone for an account brought back by an admin, where nobody else holds them. */
export async function claimIfFree(uid: string, p: { name?: string; phone?: string }) {
  await Promise.all(
    claimsFor(p).map(async (c) => {
      const ref = doc(db, c.col, c.key);
      if (!(await getDoc(ref)).exists()) await setDoc(ref, { uid, createdAt: serverTimestamp() });
    }),
  );
}

let synced = false;
/**
 * Admin, once per visit: claims the name and phone of accounts created before these checks
 * existed (oldest account first, removed accounts skipped), so new sign-ups can't copy them.
 */
export async function syncClaims(users: { uid: string; name?: string; phone?: string; status?: string; createdAt?: { toMillis(): number } }[]) {
  if (synced) return;
  synced = true;
  const [names, phones] = await Promise.all([getDocs(collection(db, "uniqueNames")), getDocs(collection(db, "uniquePhones"))]);
  const have = { uniqueNames: new Set(names.docs.map((d) => d.id)), uniquePhones: new Set(phones.docs.map((d) => d.id)) };
  const active = users.filter((u) => u.status !== "removed").sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0));
  for (const u of active)
    for (const c of claimsFor(u)) {
      if (have[c.col].has(c.key)) continue;
      have[c.col].add(c.key);
      await setDoc(doc(db, c.col, c.key), { uid: u.uid, createdAt: serverTimestamp() }).catch((err) => console.warn("Could not claim", c, err));
    }
}
