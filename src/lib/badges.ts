"use client";

import { collection, onSnapshot, query, where, type DocumentData } from "firebase/firestore";
import { useEffect, useState } from "react";
import type { AppUser } from "./auth";
import { syllabusFor, useCatalog } from "./catalog";
import { db } from "./firebase";
import { useMailbox } from "./inbox";
import { can } from "./staff";
import { assignmentsFor, modulesFor } from "@/data/learning";

/**
 * Sidebar counts: work waiting in each section. Each count drops as items are dealt with
 * (a payment approved, a ticket resolved, an enquiry answered, a message read, …).
 */
function useCount(path: string, field: string | null, value: string | null, keep: (d: DocumentData) => boolean, enabled: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const q = field && value ? query(collection(db, path), where(field, "==", value)) : collection(db, path);
    return onSnapshot(
      q,
      (snap) => setN(snap.docs.filter((d) => keep(d.data())).length),
      () => setN(0),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `keep` is a fixed predicate per call site
  }, [path, field, value, enabled]);
  return enabled ? n : 0;
}

const activeTicket = (d: DocumentData) => d.status === "open" || d.status === "in-progress";

/** Courses finished (every lesson and assignment) that have no certificate yet. */
function useCertificatesDue(enabled: boolean) {
  const catalog = useCatalog(true);
  const [progress, setProgress] = useState<DocumentData[]>([]);
  const [certs, setCerts] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!enabled) return;
    const a = onSnapshot(collection(db, "progress"), (s) => setProgress(s.docs.map((d) => ({ ...d.data(), id: d.id }))), () => setProgress([]));
    const b = onSnapshot(collection(db, "certificates"), (s) => setCerts(new Set(s.docs.map((d) => `${d.data().uid}_${d.data().slug}`))), () => setCerts(new Set()));
    return () => {
      a();
      b();
    };
  }, [enabled]);
  if (!enabled) return 0;
  return progress.filter((r) => {
    if (certs.has(r.id)) return false;
    const course = catalog.find((c) => c.slug === r.slug);
    if (!course) return false;
    const syllabus = syllabusFor(course);
    const lessons = modulesFor(syllabus).flatMap((m) => m.lessons);
    const tasks = assignmentsFor(syllabus);
    const completed: string[] = r.completed ?? [];
    const assignments: Record<string, unknown> = r.assignments ?? {};
    return lessons.length > 0 && lessons.every((l) => completed.includes(l.id)) && tasks.every((t) => assignments[t.id]);
  }).length;
}

export function useAdminBadges(user: AppUser | null): Record<string, number> {
  const admin = user?.role === "admin";
  const { unread } = useMailbox(user);
  return {
    orders: useCount("orders", null, null, (d) => d.method === "manual" && d.status === "pending", admin),
    enquiries: useCount("enquiries", "status", "new", () => true, admin),
    tickets: useCount("tickets", null, null, activeTicket, admin),
    jobs: useCount("jobApplications", "status", "new", () => true, admin),
    certificates: useCertificatesDue(admin),
    inbox: unread,
  };
}

export function useStaffBadges(user: AppUser | null): Record<string, number> {
  const emp = user?.role === "employee" ? user : null;
  const has = (p: Parameters<typeof can>[1]) => !!emp && can(emp, p);
  const { unread } = useMailbox(user);
  return {
    orders: useCount("orders", null, null, (d) => d.method === "manual" && d.status === "pending", has("payments.view") || has("payments.approve")),
    tickets: useCount("tickets", null, null, activeTicket, has("tickets.manage")),
    assigned: useCount("tickets", "assignedTo", emp?.uid ?? null, activeTicket, !!emp),
    jobs: useCount("jobApplications", "status", "new", () => true, has("jobs.manage")),
    inbox: unread,
  };
}

/** Tutors and students: messages, and (tutors) tickets assigned to them. */
export function useMemberBadges(user: AppUser | null): Record<string, number> {
  const { unread } = useMailbox(user);
  return {
    assigned: useCount("tickets", "assignedTo", user?.uid ?? null, activeTicket, user?.role === "mentor"),
    inbox: unread,
  };
}
