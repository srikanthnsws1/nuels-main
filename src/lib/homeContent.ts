"use client";

import { useEffect, useState } from "react";
import { categories, mentors, stories, type Category, type Mentor, type Story } from "@/data/site";

/**
 * Home page sections admins can edit: categories, mentors and success stories, in the public
 * Firestore collections homeCategories / homeMentors / homeStories (one document per item, sorted
 * by `order`). Until an admin adds items, the built-in ones from src/data/site.ts are shown.
 *
 * Read with Firestore's REST API instead of the SDK, so the public pages stay light.
 */
export type HomeKind = "categories" | "mentors" | "stories";
export type HomeMentor = Mentor & { linkedin?: string; instagram?: string };
export type HomeItem = { id?: string; order?: number } & (Category | HomeMentor | Story);
type ItemOf<K extends HomeKind> = K extends "categories" ? Category : K extends "mentors" ? HomeMentor : Story;

export const homeCollections: Record<HomeKind, string> = { categories: "homeCategories", mentors: "homeMentors", stories: "homeStories" };
export const builtInItems: { [K in HomeKind]: ItemOf<K>[] } = { categories, mentors, stories };

const PROJECT = "nuelsmart-fb72e";
const API_KEY = "AIzaSyC6IA6X24f0U4qAvcqzisYdo4sj1HS_-PI";
const base =
  process.env.NEXT_PUBLIC_USE_EMULATORS === "1"
    ? `http://127.0.0.1:${process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT ?? 8085}/v1`
    : "https://firestore.googleapis.com/v1";

type RestValue = { stringValue?: string; integerValue?: string; doubleValue?: number; booleanValue?: boolean };
const plain = (v: RestValue) => v.stringValue ?? (v.integerValue !== undefined ? Number(v.integerValue) : v.doubleValue ?? v.booleanValue);

const cache = new Map<HomeKind, Promise<HomeItem[] | null>>();
function load(kind: HomeKind) {
  if (!cache.has(kind)) {
    const url = `${base}/projects/${PROJECT}/databases/(default)/documents/${homeCollections[kind]}?pageSize=200&key=${API_KEY}`;
    const job = fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((body: { documents?: { name: string; fields?: Record<string, RestValue> }[] }) => {
        const docs = body.documents ?? [];
        if (!docs.length) return null;
        return docs
          .map((d) => ({ id: d.name.split("/").pop(), ...Object.fromEntries(Object.entries(d.fields ?? {}).map(([k, v]) => [k, plain(v)])) }) as HomeItem)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      })
      .catch((err) => {
        console.warn(`Couldn't load ${kind}; showing the built-in list`, err);
        return null;
      });
    cache.set(kind, job);
  }
  return cache.get(kind)!;
}

/** The section's items: the admin-managed list once loaded, otherwise the built-in one. */
export function useHomeItems<K extends HomeKind>(kind: K): ItemOf<K>[] {
  const [items, setItems] = useState<ItemOf<K>[]>(builtInItems[kind] as ItemOf<K>[]);
  useEffect(() => {
    let live = true;
    load(kind).then((rows) => live && rows && setItems(rows as unknown as ItemOf<K>[]));
    return () => {
      live = false;
    };
  }, [kind]);
  return items;
}

/** How many items each home page section shows (the full pages show all). */
export const HOME_LIMIT = 3;
