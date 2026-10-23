"use client";

import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import type { AppUser } from "./auth";
import { db } from "./firebase";

/**
 * Public mentor cards in `mentorProfiles/{uid}`. Private profile data (phone, email,
 * address) stays in `users/{uid}`; only what a mentor fills in here is shown on the site.
 * Only approved mentors can write their own card (see firestore.rules).
 */
export type MentorProfileInput = {
  headline: string;
  experience: string;
  company: string;
  bio: string;
  linkedin?: string;
};

export type MentorProfile = MentorProfileInput & {
  uid: string;
  name: string;
  photo?: string;
  updatedAt?: Timestamp;
};

/** All published mentor cards, alphabetical. `mentors` is null while loading. */
export function useMentorProfiles() {
  const [mentors, setMentors] = useState<MentorProfile[] | null>(null);
  useEffect(
    () =>
      onSnapshot(
        collection(db, "mentorProfiles"),
        (snap) =>
          setMentors(
            snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as MentorProfile).sort((a, b) => a.name.localeCompare(b.name)),
          ),
        () => setMentors([]),
      ),
    [],
  );
  return mentors;
}

export async function getMentorProfile(uid: string): Promise<MentorProfile | null> {
  const snap = await getDoc(doc(db, "mentorProfiles", uid));
  return snap.exists() ? ({ uid: snap.id, ...snap.data() } as MentorProfile) : null;
}

export function saveMentorProfile(mentor: AppUser, input: MentorProfileInput) {
  const { linkedin, ...rest } = input;
  return setDoc(doc(db, "mentorProfiles", mentor.uid), {
    ...rest,
    ...(linkedin ? { linkedin } : {}),
    name: mentor.name,
    ...(mentor.photo ? { photo: mentor.photo } : {}),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Where a mentor wants their earnings paid: bank account and/or UPI. Kept in
 * `mentorPayouts/{uid}`, readable only by that mentor and admins, never on the public card.
 */
export type MentorPayout = {
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  upiId: string;
  /** Mobile number linked to UPI. */
  upiNumber: string;
  updatedAt?: Timestamp;
};

/** Same checks as firestore.rules; empty fields are allowed. */
export const payoutPatterns = {
  accountNumber: /^[0-9]{6,20}$/,
  ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  upiId: /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/,
  upiNumber: /^[6-9][0-9]{9}$/,
};

export async function getMentorPayout(uid: string): Promise<MentorPayout | null> {
  const snap = await getDoc(doc(db, "mentorPayouts", uid));
  return snap.exists() ? (snap.data() as MentorPayout) : null;
}

export function saveMentorPayout(uid: string, payout: Omit<MentorPayout, "updatedAt">) {
  return setDoc(doc(db, "mentorPayouts", uid), { ...payout, updatedAt: serverTimestamp() });
}

/** Every mentor's payout details by uid (admins only), kept live. */
export function useAllMentorPayouts() {
  const [payouts, setPayouts] = useState<Record<string, MentorPayout> | null>(null);
  useEffect(
    () =>
      onSnapshot(
        collection(db, "mentorPayouts"),
        (snap) => setPayouts(Object.fromEntries(snap.docs.map((d) => [d.id, d.data() as MentorPayout]))),
        () => setPayouts({}),
      ),
    [],
  );
  return payouts;
}

/** Keeps a published mentor card's photo in step with the account photo. */
export async function syncMentorPhoto(uid: string, photo: string) {
  const ref = doc(db, "mentorProfiles", uid);
  if (!(await getDoc(ref)).exists()) return;
  await updateDoc(ref, { photo: photo || deleteField(), updatedAt: serverTimestamp() });
}

/** Unpublishes a mentor card, e.g. when an admin removes the mentor role. */
export function deleteMentorProfile(uid: string) {
  return deleteDoc(doc(db, "mentorProfiles", uid));
}
