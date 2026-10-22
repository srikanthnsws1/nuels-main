"use client";

import { collection, deleteField, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { useSyncExternalStore } from "react";
import { courseDetails } from "@/data/courseDetails";
import { courses, type Course } from "@/data/site";
import { db } from "./firebase";

/**
 * The live course catalog: the built-in courses in src/data/site.ts, with any changes admins
 * make in Firestore `catalog/{slug}` applied on top, plus courses admins add. Prices, mentor,
 * level, lessons and syllabus all come from here at runtime, so edits show without a rebuild.
 */
export type Syllabus = { title: string; topics: string[] }[];
export type CatalogCourse = Course & {
  /** Syllabus override; built-in courses fall back to courseDetails. */
  modules?: Syllabus;
  /** Hidden courses aren't listed and can't be bought. */
  hidden?: boolean;
  /** Added by an admin (no pre-built page). */
  custom?: boolean;
};

export const levels = ["Beginner", "Intermediate", "Advanced"] as const;
export const builtInSlugs = new Set(courses.map((c) => c.slug));

type Override = Partial<CatalogCourse>;

let overrides: Record<string, Override> = {};
let merged: CatalogCourse[] = courses;
let started = false;
let loaded = false;
const listeners = new Set<() => void>();

function rebuild() {
  const builtIn = courses.map((c) => ({ ...c, ...overrides[c.slug], slug: c.slug }));
  const added = Object.entries(overrides)
    .filter(([slug, o]) => !builtInSlugs.has(slug) && o.title && typeof o.price === "number")
    .map(([slug, o]) => ({
      description: "",
      mentor: "",
      category: "Design",
      level: "Beginner" as const,
      lessons: 0,
      hours: 0,
      oldPrice: o.price!,
      image: "/images/cat-design.webp",
      ...o,
      title: o.title!,
      price: o.price!,
      slug,
      custom: true,
    }));
  merged = [...builtIn, ...added];
  listeners.forEach((l) => l());
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  onSnapshot(
    collection(db, "catalog"),
    (snap) => {
      overrides = Object.fromEntries(snap.docs.map((d) => [d.id, d.data() as Override]));
      loaded = true;
      rebuild();
    },
    (err) => {
      console.warn("Couldn't load the course catalog; using built-in courses", err);
      loaded = true;
      listeners.forEach((l) => l());
    },
  );
}

function subscribe(onChange: () => void) {
  start();
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** Every course, including hidden ones (for admins and for pricing existing orders). */
export function getCatalog(): CatalogCourse[] {
  start();
  return merged;
}

/** The live catalog; hidden courses are left out unless asked for. */
export function useCatalog(includeHidden = false): CatalogCourse[] {
  const all = useSyncExternalStore(subscribe, () => merged, () => courses as CatalogCourse[]);
  return includeHidden ? all : all.filter((c) => !c.hidden);
}

/** True once the live catalog has loaded (or failed and fallen back to built-in courses). */
export function useCatalogLoaded(): boolean {
  return useSyncExternalStore(subscribe, () => loaded, () => false);
}

export function useCourse(slug: string): CatalogCourse | undefined {
  return useCatalog(true).find((c) => c.slug === slug);
}

export function findCourse(slug: string) {
  return getCatalog().find((c) => c.slug === slug);
}

/** Built-in courses have a pre-built page; added ones use the client-rendered view. */
export function courseHref(slug: string) {
  return builtInSlugs.has(slug) ? `/courses/${slug}` : `/courses/view?c=${encodeURIComponent(slug)}`;
}

export const learnHref = (slug: string) => `/learn?course=${encodeURIComponent(slug)}`;

export function syllabusFor(course: Pick<CatalogCourse, "slug" | "modules"> | undefined): Syllabus {
  if (!course) return [];
  return course.modules?.length ? course.modules : (courseDetails[course.slug]?.modules ?? []);
}

/** "Data Science with R!" → "data-science-with-r" */
export function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Staff: creates or updates a course. Empty optional fields are removed. */
export function saveCourse(slug: string, data: Omit<CatalogCourse, "slug" | "custom">) {
  const clean: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };
  for (const k of ["description", "image"] as const) if (!data[k]) clean[k] = deleteField();
  if (!data.modules?.length) clean.modules = deleteField();
  return setDoc(doc(db, "catalog", slug), clean, { merge: true });
}

export function setCourseHidden(slug: string, hidden: boolean) {
  return setDoc(doc(db, "catalog", slug), { hidden, updatedAt: serverTimestamp() }, { merge: true });
}
