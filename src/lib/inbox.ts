"use client";

import { Timestamp, arrayUnion, collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where, writeBatch } from "firebase/firestore";
import { useEffect, useState } from "react";
import type { AppUser } from "./auth";
import { db } from "./firebase";
import { can } from "./staff";

/**
 * Inbox: `messages/{id}`, one document per recipient. `to` is the recipient's uid, or "admins"
 * for the shared admin office mailbox (read by every admin, and by employees with the
 * "inbox.office" permission). Who may write to whom is enforced in firestore.rules:
 *   students and tutors → the admin office or an admin;
 *   employees → admins, the office and other employees (students and tutors too with "inbox.learners");
 *   admins → anyone.
 */
export const OFFICE = "admins";

export type Message = {
  id: string;
  from: string;
  fromName: string;
  fromRole: string;
  fromMemberId?: string;
  to: string;
  toName: string;
  subject: string;
  body: string;
  /** The first message of the conversation; replies share it. */
  threadId?: string;
  readBy: string[];
  createdAt?: Timestamp;
};

export type Recipient = { uid: string; name: string; role: string; memberId?: string; designation?: string };
export const officeRecipient: Recipient = { uid: OFFICE, name: "Nuel Smart Admin office", role: "office" };

/** Reads the shared office mailbox. */
export const readsOffice = (u: Pick<AppUser, "role" | "permissions">) => u.role === "admin" || (u.role === "employee" && u.permissions.includes("inbox.office"));

/** Whether `me` may write to someone with this role (mirrors firestore.rules). */
export function canMessage(me: Pick<AppUser, "role" | "permissions">, role: string) {
  if (role === "office" || me.role === "admin") return true;
  if (me.role === "employee") return role === "admin" || role === "employee" || ((role === "student" || role === "mentor") && can(me, "inbox.learners"));
  return role === "admin";
}

export async function sendMessage(
  me: Pick<AppUser, "uid" | "name" | "role" | "memberId">,
  to: Recipient[],
  subject: string,
  body: string,
  threadId?: string,
) {
  const batch = writeBatch(db);
  for (const r of to) {
    batch.set(doc(collection(db, "messages")), {
      from: me.uid,
      fromName: me.name,
      fromRole: me.role,
      ...(me.memberId ? { fromMemberId: me.memberId } : {}),
      to: r.uid,
      toName: r.name,
      subject: subject.trim().slice(0, 200) || "(no subject)",
      body: body.trim().slice(0, 5000),
      ...(threadId ? { threadId } : {}),
      readBy: [],
      createdAt: serverTimestamp(),
    });
  }
  await batch.commit();
}

export const markRead = (m: Message, uid: string) => (m.readBy.includes(uid) ? Promise.resolve() : updateDoc(doc(db, "messages", m.id), { readBy: arrayUnion(uid) }));

const byNewest = (a: Message, b: Message) => (b.createdAt?.toMillis() ?? Date.now()) - (a.createdAt?.toMillis() ?? Date.now());

/** Received (own + office mailbox when allowed) and sent messages, live. */
export function useMailbox(user: Pick<AppUser, "uid" | "role" | "permissions"> | null) {
  const [mine, setMine] = useState<Message[] | null>(null);
  const [office, setOffice] = useState<Message[]>([]);
  const [sent, setSent] = useState<Message[] | null>(null);
  const [error, setError] = useState("");
  const uid = user?.uid;
  const office$ = !!user && readsOffice(user);
  useEffect(() => {
    if (!uid) return;
    const rows = (s: { docs: { id: string; data: (o?: object) => unknown }[] }) =>
      s.docs.map((d) => ({ readBy: [], ...(d.data({ serverTimestamps: "estimate" }) as object), id: d.id }) as unknown as Message).sort(byNewest);
    const fail = () => setError("Couldn't load messages. Make sure the Firestore rules are deployed.");
    const subs = [
      onSnapshot(query(collection(db, "messages"), where("to", "==", uid)), (s) => setMine(rows(s)), fail),
      onSnapshot(query(collection(db, "messages"), where("from", "==", uid)), (s) => setSent(rows(s)), fail),
      ...(office$ ? [onSnapshot(query(collection(db, "messages"), where("to", "==", OFFICE)), (s) => setOffice(rows(s)), fail)] : []),
    ];
    return () => subs.forEach((u) => u());
  }, [uid, office$]);
  const inbox = mine === null ? null : [...mine, ...office].sort(byNewest);
  const unread = (inbox ?? []).filter((m) => uid && !m.readBy.includes(uid)).length;
  return { inbox, sent, unread, error };
}
