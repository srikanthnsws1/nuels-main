"use client";

import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeftIcon, CloseIcon, InboxIcon, SendIcon } from "../icons";
import { Card, EmptyState, SearchBox, matchesSearch } from "./ui";
import { roleLabel, type AppUser } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { OFFICE, canMessage, markRead, officeRecipient, sendMessage, useMailbox, type Message, type Recipient } from "@/lib/inbox";
import { can } from "@/lib/staff";

const field = "w-full rounded-2xl border border-forest-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-forest-300";
const when = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const whenLong = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

const roleTag = (role: string) => (role === "office" ? "Office" : role === "mentor" ? "Tutor" : role === "employee" ? "Employee" : roleLabel[role as keyof typeof roleLabel] ?? role);

/** People this user may write to (what firestore.rules allow them to read and message). */
function useRecipients(user: AppUser) {
  const [people, setPeople] = useState<Recipient[]>([]);
  const learners = user.role === "employee" && can(user, "inbox.learners");
  useEffect(() => {
    if (user.role === "student" || user.role === "mentor") return;
    const roles = user.role === "admin" ? null : learners ? ["admin", "employee", "student", "mentor"] : ["admin", "employee"];
    const q = roles ? query(collection(db, "users"), where("role", "in", roles)) : collection(db, "users");
    return onSnapshot(
      q,
      (snap) =>
        setPeople(
          snap.docs
            .map((d) => ({ uid: d.id, ...(d.data() as { name: string; role: string; memberId?: string; designation?: string; status?: string }) }))
            .filter((u) => u.uid !== user.uid && (u.status ?? "active") === "active" && canMessage(user, u.role))
            .map(({ uid, name, role, memberId, designation }) => ({ uid, name, role, memberId, designation }))
            .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")),
        ),
      (err) => console.warn("Couldn't load people to message", err),
    );
  }, [user, learners]);
  return people;
}

function Compose({ user, people, reply, onSent, onCancel }: { user: AppUser; people: Recipient[]; reply?: Message; onSent: () => void; onCancel: () => void }) {
  const learner = user.role === "student" || user.role === "mentor";
  const replyTo: Recipient | undefined = reply
    ? reply.from === user.uid
      ? { uid: reply.to, name: reply.toName, role: reply.to === OFFICE ? "office" : "" }
      : { uid: reply.from, name: reply.fromName, role: reply.fromRole }
    : undefined;
  const [to, setTo] = useState<Recipient[]>(replyTo ? [replyTo] : learner ? [officeRecipient] : []);
  const [find, setFind] = useState("");
  const [subject, setSubject] = useState(reply ? (/^re:/i.test(reply.subject) ? reply.subject : `Re: ${reply.subject}`) : "");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const options = [officeRecipient, ...people].filter((p) => !to.some((t) => t.uid === p.uid));
  const suggestions = find.trim() ? options.filter((p) => matchesSearch(find, p.name, p.memberId, p.designation, roleTag(p.role))).slice(0, 6) : [];
  const add = (list: Recipient[]) => setTo((t) => [...t, ...list.filter((p) => !t.some((x) => x.uid === p.uid))]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!to.length) return setError("Choose who to send it to.");
    if (!subject.trim()) return setError("Add a subject.");
    if (body.trim().length < 2) return setError("Write your message.");
    setSending(true);
    setError("");
    try {
      // Big lists go in chunks (a batch holds at most 500 writes).
      for (let i = 0; i < to.length; i += 400) await sendMessage(user, to.slice(i, i + 400), subject, body, reply ? (reply.threadId ?? reply.id) : undefined);
      onSent();
    } catch (err) {
      console.error("Could not send message", err);
      setError("Couldn't send. You may not be allowed to message one of these people, or you're offline.");
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div>
        <span className="mb-1.5 block text-sm font-medium text-forest-900">To</span>
        <div className="flex flex-wrap gap-2">
          {to.map((r) => (
            <span key={r.uid} className="inline-flex items-center gap-1.5 rounded-full bg-forest-700 py-1 pl-3 pr-1.5 text-xs font-semibold text-white">
              {r.name}
              {r.role && r.role !== "office" && <span className="font-normal text-forest-200">· {roleTag(r.role)}</span>}
              {!(learner && !reply) && (
                <button type="button" onClick={() => setTo((t) => t.filter((x) => x.uid !== r.uid))} aria-label={`Remove ${r.name}`} className="rounded-full p-0.5 hover:bg-white/20">
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </span>
          ))}
        </div>
        {learner ? (
          !reply && <p className="mt-2 text-xs text-slate-500">Students and tutors write to the admin office; any admin can reply.</p>
        ) : (
          <div className="relative mt-2">
            <SearchBox value={find} onChange={setFind} placeholder="Add people: name, ID or role" />
            {suggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-2xl border border-forest-100 bg-white shadow-xl">
                {suggestions.map((p) => (
                  <li key={p.uid}>
                    <button
                      type="button"
                      onClick={() => {
                        add([p]);
                        setFind("");
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-forest-50"
                    >
                      <span className="font-semibold text-forest-950">{p.name}</span>
                      {p.memberId && <span className="font-mono text-xs text-forest-700">{p.memberId}</span>}
                      <span className="ml-auto text-xs text-slate-500">{p.designation ?? roleTag(p.role)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {user.role === "admin" && (
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="py-1 text-slate-500">Add all:</span>
                {(["admin", "employee", "mentor", "student"] as const).map((r) => {
                  const list = people.filter((p) => p.role === r);
                  return list.length ? (
                    <button key={r} type="button" onClick={() => add(list)} className="rounded-full border border-forest-200 px-3 py-1 font-semibold text-forest-700 hover:bg-forest-50">
                      {r === "admin" ? "Admins" : r === "employee" ? "Employees" : r === "mentor" ? "Tutors" : "Students"} ({list.length})
                    </button>
                  ) : null;
                })}
              </div>
            )}
          </div>
        )}
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-forest-900">Subject</span>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} className={field} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-forest-900">Message</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={7} maxLength={5000} className={`${field} resize-y`} />
      </label>
      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={sending} className="inline-flex items-center gap-2 rounded-full bg-forest-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-forest-700/20 hover:bg-forest-600 disabled:opacity-60">
          <SendIcon className="h-4 w-4" /> {sending ? "Sending…" : to.length > 1 ? `Send to ${to.length} people` : "Send"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-full border border-forest-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-forest-50">
          Cancel
        </button>
      </div>
    </form>
  );
}

function Thread({ m, all, user, onBack, onReply }: { m: Message; all: Message[]; user: AppUser; onBack: () => void; onReply: () => void }) {
  const threadId = m.threadId ?? m.id;
  // The conversation: every copy this user can see, one per send (a message to many shows once).
  const seen = new Set<string>();
  const thread = all
    .filter((x) => (x.threadId ?? x.id) === threadId)
    .sort((a, b) => (a.createdAt?.toMillis() ?? Date.now()) - (b.createdAt?.toMillis() ?? Date.now()))
    .filter((x) => {
      const k = `${x.from}|${x.createdAt?.toMillis()}|${x.body.length}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  useEffect(() => {
    thread.filter((x) => x.from !== user.uid && !x.readBy.includes(user.uid)).forEach((x) => markRead(x, user.uid).catch(() => {}));
  }, [thread, user.uid]);
  return (
    <div>
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest-700 hover:text-forest-500">
        <ArrowLeftIcon className="h-4 w-4" /> Back
      </button>
      <h3 className="mt-3 text-xl font-bold text-forest-950">{m.subject}</h3>
      <ol className="mt-4 space-y-3">
        {thread.map((x) => {
          const mine = x.from === user.uid;
          const recipients = all.filter((y) => y.from === x.from && y.createdAt?.toMillis() === x.createdAt?.toMillis() && y.body === x.body).map((y) => y.toName);
          return (
            <li key={x.id} className={`rounded-2xl border p-4 ${mine ? "border-forest-100 bg-forest-50/60" : "border-forest-100 bg-white"}`}>
              <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="font-semibold text-forest-950">{mine ? "You" : x.fromName}</span>
                {!mine && <span className="text-xs text-slate-500">{x.fromMemberId ? `${x.fromMemberId} · ` : ""}{roleTag(x.fromRole)}</span>}
                <span className="text-xs text-slate-500">to {mine ? [...new Set(recipients.length ? recipients : [x.toName])].join(", ") : x.to === OFFICE ? "Admin office" : "you"}</span>
                <span className="ml-auto text-xs text-slate-400">{x.createdAt ? whenLong.format(x.createdAt.toDate()) : "Sending…"}</span>
              </p>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{x.body}</p>
            </li>
          );
        })}
      </ol>
      <button type="button" onClick={onReply} className="mt-4 inline-flex items-center gap-2 rounded-full bg-forest-700 px-6 py-3 text-sm font-semibold text-white hover:bg-forest-600">
        <SendIcon className="h-4 w-4" /> Reply
      </button>
    </div>
  );
}

/** Inbox / Sent / Compose: messages inside the website between learners, tutors, staff and admins. */
export default function InboxPage({ user }: { user: AppUser }) {
  const { inbox, sent, unread, error } = useMailbox(user);
  const people = useRecipients(user);
  const [tab, setTab] = useState<"inbox" | "sent" | "compose">("inbox");
  const [open, setOpen] = useState<Message | null>(null);
  const [replying, setReplying] = useState<Message | null>(null);
  const [find, setFind] = useState("");
  const [notice, setNotice] = useState("");
  const all = [...(inbox ?? []), ...(sent ?? [])];
  // A message to many people is stored once per person: show it once in Sent.
  const sentOnce = (sent ?? []).filter((m, i, list) => list.findIndex((x) => x.createdAt?.toMillis() === m.createdAt?.toMillis() && x.body === m.body) === i);
  const list = (tab === "sent" ? sentOnce : inbox ?? []).filter((m) => matchesSearch(find, m.subject, m.body, m.fromName, m.toName, m.fromMemberId));

  const startCompose = (reply?: Message) => {
    setReplying(reply ?? null);
    setOpen(null);
    setNotice("");
    setTab("compose");
  };

  return (
    <Card id="inbox">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="mr-auto text-lg font-bold text-forest-950">Inbox</h2>
        {(["inbox", "sent"] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={tab === t}
            onClick={() => {
              setTab(t);
              setOpen(null);
            }}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === t ? "bg-forest-700 text-white" : "bg-forest-50 text-forest-800 hover:bg-forest-100"}`}
          >
            {t === "inbox" ? `Inbox${unread ? ` (${unread})` : ""}` : "Sent"}
          </button>
        ))}
        <button type="button" onClick={() => startCompose()} className="inline-flex items-center gap-1.5 rounded-full bg-spark-500 px-4 py-1.5 text-sm font-bold text-forest-900 hover:bg-spark-400">
          <SendIcon className="h-4 w-4" /> Compose
        </button>
      </div>
      {notice && <p className="mt-4 rounded-2xl bg-spark-500/20 px-4 py-3 text-sm font-medium text-forest-800">{notice}</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <div className="mt-5">
        {tab === "compose" ? (
          <Compose
            key={replying?.id ?? "new"}
            user={user}
            people={people}
            reply={replying ?? undefined}
            onSent={() => {
              setNotice("Message sent.");
              setReplying(null);
              setTab("sent");
            }}
            onCancel={() => {
              setReplying(null);
              setTab("inbox");
            }}
          />
        ) : open ? (
          <Thread m={open} all={all} user={user} onBack={() => setOpen(null)} onReply={() => startCompose(open)} />
        ) : (
          <>
            <SearchBox value={find} onChange={setFind} placeholder="Search messages" />
            {(tab === "sent" ? sent : inbox) === null ? (
              <p className="mt-6 text-sm text-slate-500">Loading…</p>
            ) : list.length === 0 ? (
              <EmptyState icon={InboxIcon} title={find ? "No messages match" : tab === "sent" ? "Nothing sent yet" : "No messages yet"} />
            ) : (
              <ul className="mt-4 divide-y divide-forest-100 overflow-hidden rounded-2xl border border-forest-100">
                {list.map((m) => {
                  const isUnread = tab === "inbox" && !m.readBy.includes(user.uid);
                  const copies = tab === "sent" ? (sent ?? []).filter((x) => x.createdAt?.toMillis() === m.createdAt?.toMillis() && x.body === m.body).length : 1;
                  return (
                    <li key={m.id}>
                      <button type="button" onClick={() => setOpen(m)} className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-forest-50 ${isUnread ? "bg-blue-50/50" : "bg-white"}`}>
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${isUnread ? "bg-blue-600" : "bg-transparent"}`} aria-label={isUnread ? "Unread" : undefined} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline gap-2">
                            <span className={`truncate text-sm ${isUnread ? "font-bold text-forest-950" : "font-semibold text-forest-900"}`}>
                              {tab === "sent" ? `To ${m.toName}${copies > 1 ? ` +${copies - 1}` : ""}` : m.fromName}
                            </span>
                            {tab === "inbox" && <span className="shrink-0 text-xs text-slate-400">{m.to === OFFICE ? "Admin office" : roleTag(m.fromRole)}</span>}
                            <span className="ml-auto shrink-0 text-xs text-slate-400">{m.createdAt ? when.format(m.createdAt.toDate()) : ""}</span>
                          </span>
                          <span className={`block truncate text-sm ${isUnread ? "font-semibold text-forest-950" : "text-slate-700"}`}>{m.subject}</span>
                          <span className="block truncate text-xs text-slate-500">{m.body}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
