"use client";

import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc, type Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "./firebase";

/**
 * Messages from the Contact page: `enquiries/{id}`. Anyone may send one; only admins read them and
 * move them through new → reviewed → contacted → registered (or removed).
 */
export type EnquiryStatus = "new" | "reviewed" | "contacted" | "registered" | "removed";

export type Enquiry = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  topic: string;
  message: string;
  status: EnquiryStatus;
  /** Set when the sender was logged in. */
  uid?: string;
  createdAt?: Timestamp;
  statusAt?: Timestamp;
};

export const enquiryStatuses: { id: EnquiryStatus; label: string; action: string; tone: string }[] = [
  { id: "new", label: "New", action: "Mark as new", tone: "bg-blue-100 text-blue-800" },
  { id: "reviewed", label: "Reviewed", action: "Mark as reviewed", tone: "bg-amber-100 text-amber-800" },
  { id: "contacted", label: "Contacted", action: "Mark as contacted", tone: "bg-violet-100 text-violet-800" },
  { id: "registered", label: "Registered", action: "Mark as registered", tone: "bg-spark-500/25 text-forest-800" },
  { id: "removed", label: "Removed", action: "Remove", tone: "bg-slate-100 text-slate-500" },
];

export function sendEnquiry(e: { name: string; email: string; phone?: string; topic: string; message: string }) {
  const uid = auth.currentUser?.uid;
  return addDoc(collection(db, "enquiries"), {
    name: e.name.trim().slice(0, 100),
    email: e.email.trim().slice(0, 200),
    ...(e.phone?.trim() ? { phone: e.phone.trim().slice(0, 20) } : {}),
    topic: e.topic.slice(0, 60),
    message: e.message.trim().slice(0, 2000),
    status: "new",
    ...(uid ? { uid } : {}),
    createdAt: serverTimestamp(),
  });
}

/** Admin: every enquiry, newest first; null while loading. */
export function useEnquiries(): { rows: Enquiry[] | null; error: string } {
  const [state, setState] = useState<{ rows: Enquiry[] | null; error: string }>({ rows: null, error: "" });
  useEffect(
    () =>
      onSnapshot(
        collection(db, "enquiries"),
        (snap) =>
          setState({
            rows: snap.docs
              .map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }) as Enquiry)
              .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)),
            error: "",
          }),
        () => setState({ rows: [], error: "Couldn't load enquiries. Make sure the Firestore rules are deployed." }),
      ),
    [],
  );
  return state;
}

export function setEnquiryStatus(id: string, status: EnquiryStatus, by: string) {
  return updateDoc(doc(db, "enquiries", id), { status, statusAt: serverTimestamp(), statusBy: by });
}

export function deleteEnquiry(id: string) {
  return deleteDoc(doc(db, "enquiries", id));
}
