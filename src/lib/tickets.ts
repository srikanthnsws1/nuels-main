"use client";

import { Timestamp, addDoc, arrayUnion, collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "./firebase";

/**
 * Support tickets: `tickets/{id}`. Anyone can raise one (including people who can't log in because
 * they lost their password or ID). Admins assign each ticket to an admin, post updates and close it.
 * Signed-in learners see the tickets they raised, with the updates.
 */
export type TicketStatus = "open" | "in-progress" | "resolved" | "closed";
export type TicketCategory =
  | "forgot-password"
  | "forgot-id"
  | "login"
  | "payment"
  | "course"
  | "quiz"
  | "leave"
  | "absence"
  | "transfer"
  | "suggestion"
  | "report"
  | "other";

export type TicketUpdate = { at: Timestamp; by: string; byName: string; text: string; status?: TicketStatus; fromRaiser?: boolean };

export type Ticket = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  memberId?: string;
  category: TicketCategory;
  message: string;
  status: TicketStatus;
  source: "user" | "admin";
  /** The raiser's account, when they were logged in. */
  uid?: string;
  /** "student", "mentor" or "employee" for requests raised from a dashboard. */
  raiserRole?: string;
  /** Leave / absence requests: first and last day (YYYY-MM-DD). */
  fromDate?: string;
  toDate?: string;
  assignedTo?: string;
  assignedName?: string;
  createdBy?: string;
  createdByName?: string;
  updates?: TicketUpdate[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export const ticketCategories: { id: TicketCategory; label: string }[] = [
  { id: "forgot-password", label: "Forgot my password" },
  { id: "forgot-id", label: "Forgot my Student / Tutor ID" },
  { id: "login", label: "Can't log in (other problem)" },
  { id: "payment", label: "Payment or enrolment" },
  { id: "course", label: "Course or live class" },
  { id: "quiz", label: "Daily quiz" },
  { id: "other", label: "Something else" },
];
/** What tutors and employees raise from their dashboard. */
export const staffCategories: { id: TicketCategory; label: string }[] = [
  { id: "leave", label: "Leave request" },
  { id: "absence", label: "Can't attend a class" },
  { id: "transfer", label: "Transfer request" },
  { id: "suggestion", label: "Suggestion" },
  { id: "report", label: "Report a problem" },
  { id: "other", label: "Something else" },
];
const allCategories = [...ticketCategories.slice(0, -1), ...staffCategories];
/** Requests with a date range. */
export const datedCategory = (c: string) => c === "leave" || c === "absence" || c === "transfer";
export const categoryLabel = (c: string) => allCategories.find((x) => x.id === c)?.label ?? c;

export const ticketStatuses: { id: TicketStatus; label: string; tone: string }[] = [
  { id: "open", label: "Open", tone: "bg-blue-100 text-blue-800" },
  { id: "in-progress", label: "In progress", tone: "bg-amber-100 text-amber-800" },
  { id: "resolved", label: "Resolved", tone: "bg-spark-500/25 text-forest-800" },
  { id: "closed", label: "Closed", tone: "bg-slate-100 text-slate-500" },
];
export const statusInfo = (s: string) => ticketStatuses.find((x) => x.id === s) ?? ticketStatuses[0];

/** Short reference shown to people, e.g. "TKT-8F3K2Q". */
export const ticketRef = (id: string) => `TKT-${id.slice(0, 6).toUpperCase()}`;

type NewTicket = {
  name: string;
  email: string;
  phone?: string;
  memberId?: string;
  category: TicketCategory;
  message: string;
  raiserRole?: string;
  fromDate?: string;
  toDate?: string;
};

const clean = (t: NewTicket) => ({
  name: t.name.trim().slice(0, 100),
  email: t.email.trim().slice(0, 200),
  ...(t.phone?.trim() ? { phone: t.phone.trim().slice(0, 20) } : {}),
  ...(t.memberId?.trim() ? { memberId: t.memberId.trim().toUpperCase().slice(0, 10) } : {}),
  category: t.category,
  message: t.message.trim().slice(0, 2000),
  ...(t.raiserRole ? { raiserRole: t.raiserRole } : {}),
  ...(t.fromDate ? { fromDate: t.fromDate } : {}),
  ...(t.toDate ? { toDate: t.toDate } : {}),
});

/** Someone a ticket can be assigned to: an admin, an employee or a tutor. */
export type Assignee = { uid: string; name: string; role: string; designation?: string };

/** A learner (or someone who can't log in) raises a ticket. Returns its reference. */
export async function raiseTicket(t: NewTicket) {
  const uid = auth.currentUser?.uid;
  const ref = await addDoc(collection(db, "tickets"), {
    ...clean(t),
    status: "open",
    source: "user",
    ...(uid ? { uid } : {}),
    createdAt: serverTimestamp(),
  });
  return ticketRef(ref.id);
}

/** Admin: opens a ticket (e.g. from a phone call) and optionally assigns it. */
export async function createTicket(t: NewTicket & { uid?: string }, me: { uid: string; name: string }, assignee?: { uid: string; name: string }) {
  const ref = await addDoc(collection(db, "tickets"), {
    ...clean(t),
    ...(t.uid ? { uid: t.uid } : {}),
    status: assignee ? "in-progress" : "open",
    source: "admin",
    createdBy: me.uid,
    createdByName: me.name,
    ...(assignee ? { assignedTo: assignee.uid, assignedName: assignee.name } : {}),
    updates: [{ at: Timestamp.now(), by: me.uid, byName: me.name, text: assignee ? `Ticket created and assigned to ${assignee.name}.` : "Ticket created." }],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ticketRef(ref.id);
}

/**
 * Admin (or an employee who handles tickets): assigns, changes status and/or posts an update;
 * every change is logged on the ticket. The assignee may change the status and post updates.
 */
export function updateTicket(
  id: string,
  me: { uid: string; name: string },
  change: { text?: string; status?: TicketStatus; assignee?: { uid: string; name: string } | null },
) {
  const notes = [
    change.assignee !== undefined && (change.assignee ? `Assigned to ${change.assignee.name}.` : "Unassigned."),
    change.status && `Status changed to ${statusInfo(change.status).label}.`,
    change.text?.trim(),
  ].filter(Boolean);
  return updateDoc(doc(db, "tickets", id), {
    ...(change.status ? { status: change.status } : {}),
    ...(change.assignee !== undefined
      ? change.assignee
        ? { assignedTo: change.assignee.uid, assignedName: change.assignee.name }
        : { assignedTo: null, assignedName: null }
      : {}),
    updates: arrayUnion({ at: Timestamp.now(), by: me.uid, byName: me.name, text: notes.join(" "), ...(change.status ? { status: change.status } : {}) }),
    updatedAt: serverTimestamp(),
  });
}

function useTicketQuery(make: (() => ReturnType<typeof query> | ReturnType<typeof collection>) | null, key: string) {
  const [state, setState] = useState<{ key: string; rows: Ticket[] | null; error: string }>({ key: "", rows: null, error: "" });
  useEffect(() => {
    if (!make) return;
    return onSnapshot(
      make(),
      (snap) =>
        setState({
          key,
          rows: snap.docs
            .map((d) => ({ id: d.id, ...(d.data({ serverTimestamps: "estimate" }) as object) }) as Ticket)
            .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)),
          error: "",
        }),
      () => setState({ key, rows: [], error: "Couldn't load tickets. Make sure the Firestore rules are deployed." }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` identifies the query
  }, [key]);
  return state.key === key ? state : { rows: null, error: "" };
}

/** The person who raised a ticket replies to the team; the reply shows in the ticket's history. */
export function replyToTicket(id: string, me: { uid: string; name: string }, text: string) {
  return updateDoc(doc(db, "tickets", id), {
    updates: arrayUnion({ at: Timestamp.now(), by: me.uid, byName: me.name, text: text.trim().slice(0, 2000), fromRaiser: true }),
    updatedAt: serverTimestamp(),
  });
}

/** Admin: every ticket, newest first. */
export const useAllTickets = (enabled = true) => useTicketQuery(enabled ? () => collection(db, "tickets") : null, enabled ? "all" : "off");
/** Tutor / employee: tickets an admin assigned to them. */
export const useAssignedTickets = (uid: string) =>
  useTicketQuery(() => query(collection(db, "tickets"), where("assignedTo", "==", uid)), `assigned:${uid}`);
/** Still needs work: open or in progress. */
export const isActive = (t: Pick<Ticket, "status">) => t.status === "open" || t.status === "in-progress";
/** Learner: the tickets they raised while logged in. */
export const useMyTickets = (uid: string) => useTicketQuery(() => query(collection(db, "tickets"), where("uid", "==", uid)), `mine:${uid}`);
