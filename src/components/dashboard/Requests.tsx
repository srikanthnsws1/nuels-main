"use client";

import { useState, type FormEvent } from "react";
import { ArrowRightIcon, CheckIcon, HelpIcon, TicketIcon } from "../icons";
import { TicketDetail, dateRange } from "./AdminTickets";
import { Card, CardTitle, EmptyState } from "./ui";
import type { AppUser } from "@/lib/auth";
import {
  categoryLabel,
  datedCategory,
  isActive,
  raiseTicket,
  replyToTicket,
  staffCategories,
  statusInfo,
  ticketRef,
  useAssignedTickets,
  useMyTickets,
  type Ticket,
  type TicketCategory,
} from "@/lib/tickets";

const field = "w-full rounded-2xl border border-forest-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-forest-300";
const when = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const today = () => new Date(Date.now() + 19800000).toISOString().slice(0, 10);

/** Tutors and employees: leave, missed class, transfer, suggestion or report, sent to the admin team as a ticket. */
function RequestForm({ user }: { user: AppUser }) {
  const [category, setCategory] = useState<TicketCategory>("leave");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const dated = datedCategory(category);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (dated && category !== "transfer" && !fromDate) return setError("Choose the date (or first day).");
    if (fromDate && toDate && toDate < fromDate) return setError("The last day can't be before the first day.");
    if (message.trim().length < 5) return setError("Please add a few details.");
    setSending(true);
    try {
      setDone(
        await raiseTicket({
          name: user.name,
          email: user.email,
          phone: user.phone,
          memberId: user.memberId,
          category,
          message,
          raiserRole: user.role,
          ...(dated && fromDate ? { fromDate, toDate: toDate || fromDate } : {}),
        }),
      );
      setMessage("");
      setFromDate("");
      setToDate("");
    } catch (err) {
      console.error("Could not send request", err);
      setError("Couldn't send your request. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  if (done)
    return (
      <div className="mt-5 rounded-3xl border border-spark-500/60 bg-spark-500/15 p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-spark-500 text-forest-900">
          <CheckIcon className="h-6 w-6" />
        </span>
        <h3 className="mt-3 text-lg font-bold text-forest-950">Request sent</h3>
        <p className="mt-1 text-sm text-slate-600">
          Reference <span className="font-mono font-bold text-forest-800">{done}</span>. The admin team replies below.
        </p>
        <button type="button" onClick={() => setDone(null)} className="mt-4 text-sm font-semibold text-forest-700 hover:text-forest-500">
          Send another request
        </button>
      </div>
    );

  return (
    <form onSubmit={submit} noValidate className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-sm font-medium text-forest-900">Type of request</span>
        <select value={category} onChange={(e) => setCategory(e.target.value as TicketCategory)} className={field}>
          {staffCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      {dated && (
        <>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-forest-900">{category === "transfer" ? "From date (optional)" : category === "absence" ? "Date" : "First day"}</span>
            <input type="date" value={fromDate} min={category === "transfer" ? undefined : today()} onChange={(e) => setFromDate(e.target.value)} className={field} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-forest-900">
              Last day <span className="font-normal text-slate-400">(optional)</span>
            </span>
            <input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} className={field} />
          </label>
        </>
      )}
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-sm font-medium text-forest-900">Details</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder={
            category === "leave"
              ? "Reason for leave, and who can cover your classes."
              : category === "absence"
                ? "Which class or batch, and why you can't attend."
                : category === "transfer"
                  ? "Where you'd like to move (branch, batch or role) and why."
                  : category === "suggestion"
                    ? "Your idea for improving classes, courses or the office."
                    : category === "report"
                      ? "What happened, when, and who was involved."
                      : "How can the admin team help?"
          }
          className={`${field} resize-none`}
        />
      </label>
      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 sm:col-span-2">
          {error}
        </p>
      )}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={sending}
          className="inline-flex items-center gap-2 rounded-full bg-forest-700 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-forest-700/20 transition hover:bg-forest-600 disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send request"} {!sending && <ArrowRightIcon className="h-4 w-4" />}
        </button>
      </div>
    </form>
  );
}

function Reply({ t, user }: { t: Ticket; user: AppUser }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  if (t.status === "closed") return null;
  const send = async () => {
    if (text.trim().length < 2) return;
    setBusy(true);
    setMsg("");
    try {
      await replyToTicket(t.id, user, text);
      setText("");
    } catch (err) {
      console.error("Could not reply", err);
      setMsg("Couldn't send. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Reply to the team…" aria-label="Reply" className={`${field} py-2.5`} />
      <button type="button" onClick={send} disabled={busy || text.trim().length < 2} className="shrink-0 rounded-full bg-forest-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-600 disabled:opacity-50">
        {busy ? "Sending…" : "Reply"}
      </button>
      {msg && <p className="text-sm text-red-600">{msg}</p>}
    </div>
  );
}

/** Tickets / requests the user raised, with the team's updates and a reply box. */
export function MyTickets({ user, title = "My tickets" }: { user: AppUser; title?: string }) {
  const { rows } = useMyTickets(user.uid);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Card>
      <CardTitle title={title} />
      {rows === null ? (
        <p className="mt-4 text-sm text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={HelpIcon} title="Nothing yet" />
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((t) => {
            const s = statusInfo(t.status);
            return (
              <li key={t.id} className="rounded-2xl border border-forest-100 p-4">
                <button type="button" onClick={() => setOpen(open === t.id ? null : t.id)} aria-expanded={open === t.id} className="flex w-full flex-wrap items-center gap-3 text-left">
                  <span className="font-mono text-xs font-bold text-forest-700">{ticketRef(t.id)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-forest-950">{categoryLabel(t.category)}</span>
                    <span className="block text-xs text-slate-500">
                      {t.fromDate && `${dateRange(t)} · `}
                      {t.createdAt ? when.format(t.createdAt.toDate()) : "Just now"}
                      {t.assignedName && ` · with ${t.assignedName}`}
                    </span>
                  </span>
                  {!!t.updates?.filter((u) => !u.fromRaiser).length && (
                    <span className="text-xs font-semibold text-forest-700">{t.updates.filter((u) => !u.fromRaiser).length} update(s)</span>
                  )}
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.tone}`}>{s.label}</span>
                </button>
                {open === t.id && (
                  <div className="mt-3 space-y-2 text-sm">
                    <p className="whitespace-pre-line rounded-xl bg-forest-50/60 px-4 py-3 text-slate-700">{t.message}</p>
                    {t.updates?.map((u, i) => (
                      <p key={i} className={u.fromRaiser ? "ml-6 rounded-xl bg-blue-50 px-3 py-2 text-blue-900" : "border-l-2 border-spark-500 pl-3 text-slate-700"}>
                        {u.text} <span className="text-xs text-slate-400">· {u.fromRaiser ? "You" : u.byName}</span>
                      </p>
                    ))}
                    <Reply t={t} user={user} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/** Tutor / employee dashboard page: raise a request and follow it. */
export function RequestsPage({ user }: { user: AppUser }) {
  return (
    <>
      <Card id="requests">
        <CardTitle title="Requests & tickets" />
        <p className="mt-1 text-sm text-slate-500">Ask for leave, report a missed class, request a transfer, or send a suggestion or report. The admin team replies here.</p>
        <RequestForm user={user} />
      </Card>
      <MyTickets user={user} title="My requests" />
    </>
  );
}

/** Tickets an admin assigned to this tutor / employee to handle. */
export function AssignedTicketsPage({ user }: { user: AppUser }) {
  const { rows, error } = useAssignedTickets(user.uid);
  const [open, setOpen] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const list = (rows ?? []).filter((t) => showDone || isActive(t));
  return (
    <Card id="assigned">
      <CardTitle
        title="Tickets assigned to me"
        action={
          <button type="button" onClick={() => setShowDone((v) => !v)} className="text-xs font-semibold text-forest-700 hover:text-forest-500">
            {showDone ? "Hide finished" : "Show finished"}
          </button>
        }
      />
      <p className="mt-1 text-sm text-slate-500">Post updates as you work on them and mark them resolved when done.</p>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {rows === null ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : list.length === 0 ? (
        <EmptyState icon={TicketIcon} title="No tickets assigned to you" />
      ) : (
        <ul className="mt-5 space-y-3">
          {list.map((t) => (
            <li key={t.id} className="rounded-2xl border border-forest-100 bg-white p-4">
              <button type="button" onClick={() => setOpen(open === t.id ? null : t.id)} aria-expanded={open === t.id} className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 text-left">
                <span className="font-mono text-xs font-bold text-forest-700">{ticketRef(t.id)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-forest-950">{t.name}</span>
                  <span className="block text-xs text-slate-500">
                    {categoryLabel(t.category)} · {t.createdAt ? when.format(t.createdAt.toDate()) : "Just now"}
                  </span>
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusInfo(t.status).tone}`}>{statusInfo(t.status).label}</span>
              </button>
              {open === t.id && <TicketDetail t={t} me={user} mode="assignee" />}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
