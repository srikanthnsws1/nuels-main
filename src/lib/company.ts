"use client";

import { addDoc, collection, deleteDoc, deleteField, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, writeBatch, type Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "./firebase";

/** Live list of a collection, newest first; null while loading. */
function useList<T extends { createdAt?: Timestamp }>(name: string): { rows: T[] | null; error: string } {
  const [state, setState] = useState<{ rows: T[] | null; error: string }>({ rows: null, error: "" });
  useEffect(
    () =>
      onSnapshot(
        collection(db, name),
        (snap) =>
          setState({
            rows: snap.docs
              .map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }) as unknown as T)
              .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)),
            error: "",
          }),
        () => setState({ rows: [], error: "Couldn't load. Make sure the Firestore rules are deployed." }),
      ),
    [name],
  );
  return state;
}

// ---------------- Job openings at Nuel Smart: `jobs/{id}` ----------------

export const jobTypes = ["Full-time", "Part-time", "Internship", "Contract", "Freelance"] as const;

export type Job = {
  id: string;
  title: string;
  department: string;
  location: string;
  type: (typeof jobTypes)[number];
  experience: string;
  openings?: number;
  description: string;
  /** Email to apply to, or an https link to a form. */
  apply: string;
  /** Last date to apply (YYYY-MM-DD). */
  lastDate?: string;
  open: boolean;
  createdAt?: Timestamp;
};
export type JobInput = Omit<Job, "id" | "createdAt">;

export const useJobs = () => useList<Job>("jobs");
export const saveJob = (job: JobInput, id?: string) =>
  id ? updateDoc(doc(db, "jobs", id), { ...job, updatedAt: serverTimestamp() }) : addDoc(collection(db, "jobs"), { ...job, createdAt: serverTimestamp() });
export const setJobOpen = (id: string, open: boolean) => updateDoc(doc(db, "jobs", id), { open, updatedAt: serverTimestamp() });
export const deleteJob = (id: string) => deleteDoc(doc(db, "jobs", id));
/** A job posted in the last 7 days. */
export const isNewJob = (j: Job) => !!j.createdAt && Date.now() - j.createdAt.toMillis() < 7 * 86_400_000;
export const applyHref = (j: Job) => {
  const apply = (j.apply ?? "").trim();
  if (apply.includes("@")) return `mailto:${apply}?subject=${encodeURIComponent(`Application: ${j.title}`)}`;
  return /^https:\/\//.test(apply) ? apply : "mailto:careers@nuelsmart.com";
};

// ---------------- Gallery: `gallery/{id}` (small preview) + `galleryImages/{id}` (full image) ----------------

export const galleryCategories = ["Quiz Toppers", "Company", "Employees", "Events", "Students", "Other"] as const;
/** A quiz topper's certificate also carries who, what score and which day's quiz. */
export type TopperDetails = { student?: string; memberId?: string; score?: string; quizDate?: string };
export type GalleryItem = TopperDetails & { id: string; title: string; category: (typeof galleryCategories)[number]; thumb: string; createdAt?: Timestamp };

/** "2026-11-15" -> "15 Nov 2026". */
export const quizDateLabel = (d?: string) =>
  d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

/** Quiz toppers, newest quiz first. */
export const toppersFirst = (items: GalleryItem[]) =>
  items
    .filter((g) => g.category === "Quiz Toppers")
    .sort((a, b) => (b.quizDate ?? "").localeCompare(a.quizDate ?? "") || (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));

const topperFields = (t: TopperDetails) =>
  Object.fromEntries(
    (["student", "memberId", "score", "quizDate"] as const).map((k) => [k, t[k]?.trim() ? t[k]!.trim().slice(0, 100) : deleteField()]),
  );

export const useGallery = () => useList<GalleryItem>("gallery");

const fullCache = new Map<string, Promise<string | null>>();
/** The full-size picture, loaded only when someone opens it. */
export function loadGalleryImage(id: string) {
  if (!fullCache.has(id)) fullCache.set(id, getDoc(doc(db, "galleryImages", id)).then((s) => (s.data()?.image as string | undefined) ?? null));
  return fullCache.get(id)!;
}

export async function addGalleryImage(item: TopperDetails & { title: string; category: GalleryItem["category"]; thumb: string; image: string }, by: string) {
  const ref = doc(collection(db, "gallery"));
  const batch = writeBatch(db);
  batch.set(doc(db, "galleryImages", ref.id), { image: item.image });
  const details = Object.fromEntries(Object.entries(topperFields(item)).filter(([, v]) => typeof v === "string"));
  batch.set(ref, { title: item.title, category: item.category, thumb: item.thumb, ...details, createdBy: by, createdAt: serverTimestamp() });
  await batch.commit();
}

/** Admin: changes a quiz topper's details, and the certificate picture when a new one is given. */
export async function updateTopper(id: string, t: TopperDetails & { title: string }, picture?: { thumb: string; image: string }) {
  const batch = writeBatch(db);
  batch.update(doc(db, "gallery", id), { title: t.title, category: "Quiz Toppers", ...topperFields(t), ...(picture ? { thumb: picture.thumb } : {}) });
  if (picture) {
    batch.set(doc(db, "galleryImages", id), { image: picture.image });
    fullCache.delete(id);
  }
  await batch.commit();
}
export const updateGalleryItem = (id: string, data: { title: string; category: GalleryItem["category"] }) => updateDoc(doc(db, "gallery", id), data);
export async function deleteGalleryImage(id: string) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "gallery", id));
  batch.delete(doc(db, "galleryImages", id));
  await batch.commit();
}

// ---------------- Certificates: `certificates/{uid}_{slug}` ----------------

export type Certificate = {
  id: string;
  uid: string;
  name: string;
  memberId?: string;
  slug: string;
  courseTitle: string;
  number: string;
  issuedByName: string;
  createdAt?: Timestamp;
};

export const useCertificates = () => useList<Certificate>("certificates");

export function useMyCertificates(uid: string) {
  const [rows, setRows] = useState<Certificate[] | null>(null);
  useEffect(
    () =>
      // Learners can only read their own certificates.
      onSnapshot(
        query(collection(db, "certificates"), where("uid", "==", uid)),
        (snap) =>
          setRows(
            snap.docs
              .map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }) as Certificate)
              .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)),
          ),
        () => setRows([]),
      ),
    [uid],
  );
  return rows;
}

/** "NSC-2026-4F2A9C": year plus a code from the learner and course. */
export function certificateNumber(uid: string, slug: string) {
  let h = 0;
  for (const ch of `${uid}:${slug}`) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
  return `NSC-${new Date().getFullYear()}-${h.toString(36).toUpperCase().padStart(6, "0").slice(-6)}`;
}

export function issueCertificate(c: Omit<Certificate, "id" | "number" | "createdAt">, by: string) {
  return setDoc(doc(db, "certificates", `${c.uid}_${c.slug}`), {
    ...c,
    number: certificateNumber(c.uid, c.slug),
    issuedBy: by,
    createdAt: serverTimestamp(),
  });
}
export const revokeCertificate = (id: string) => deleteDoc(doc(db, "certificates", id));
