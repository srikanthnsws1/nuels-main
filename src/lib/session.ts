"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * Demo-only student session kept in localStorage so login, registration and the
 * dashboard can share a name and email. Replace with real auth before launch —
 * nothing here is verified and no password is ever stored.
 */
export type Student = { name: string; email: string };

const KEY = "nuels-student";
const EVENT = "nuels-session";

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

export function signIn(student: Student) {
  try {
    localStorage.setItem(KEY, JSON.stringify(student));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export function signOut() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

/** `ready` is false during server render / hydration, before storage can be read. */
export function useStudent(): { student: Student | null; ready: boolean } {
  const raw = useSyncExternalStore(subscribe, read, () => undefined);
  return useMemo(() => {
    if (raw === undefined) return { student: null, ready: false };
    try {
      return { student: raw ? (JSON.parse(raw) as Student) : null, ready: true };
    } catch {
      return { student: null, ready: true };
    }
  }, [raw]);
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
