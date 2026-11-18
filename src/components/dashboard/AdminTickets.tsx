"use client";

import { useState, type FormEvent } from "react";
import { CheckIcon, ClockIcon, TicketIcon, UsersIcon } from "../icons";
import Dialog from "./Dialog";
import SetPasswordDialog, { PASSWORD_SERVICE_ON } from "./SetPasswordDialog";
import { Card, CardTitle, EmptyState, SearchBox, StatTiles, matchesSearch } from "./ui";
import { resetPassword, type AppUser } from "@/lib/auth";
import {
  categoryLabel,
  createTicket,
  datedCategory,
  isActive,
  staffCategories,
  statusInfo,
  ticketCategories,
  ticketRef,
  ticketStatuses,
  updateTicket,
  useAllTickets,
  type Ticket,
  type TicketCategory,
  type TicketStatus,
} from "@/lib/tickets";

export type TicketUser = { uid: string; name: string; email: string; phone?: string; memberId?: string; role: string; status?: string; designation?: string };

/** Who tickets can be assigned to, grouped for the drop-down. */
const assigneeGroups = [
  { role: "admin", label: "Admin team" },
  { role: "employee", label: "Employees / office staff" },
  { role: "mentor", label: "Tutors / instructors" },
];
export const assignable = (people: TicketUser[]) => people.filter((u) => assigneeGroups.some((g) => g.role === u.role) && (u.status ?? "active") === "active");

function AssigneeOptions({ people, me }: { people: TicketUser[]; me: AppUser }) {
  return (
    <>
      {assigneeGroups.map((g) => {
        const list = people.filter((u) => u.role === g.role).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
        return list.length ? (
          <optgroup key={g.role} label={g.label}>
            {list.map((a) => (
              <option key={a.uid} value={a.uid}>
                {a.name}
                {a.designation ? ` · ${a.designation}` : ""}
                {a.uid === me.uid ? " (me)" : ""}
              </option>
            ))}
          </optgroup>
        ) : null;
      })}
    </>
  );
}

const roleName: Record<string, string> = { student: "Student", mentor: "Tutor", employee: "Employee" };
const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const dateRange = (t: Pick<Ticket, "fromDate" | "toDate">) =>
  t.fromDate ? `${dateFmt.format(new Date(t.fromDate))}${t.toDate && t.toDate !== t.fromDate ? ` – ${dateFmt.format(new Date(t.toDate))}` : ""}` : "";

const when = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const input = "w-full rounded-2xl border border-forest-100 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-forest-300";
const digits = (s?: string) => (s ?? "").replace(/\D/g, "").slice(-10);

/** Accounts that match a ticket's email, ID or mobile number. */
function matchingAccounts(t: Pick<Ticket, "email" | "memberId" | "phone">, users: TicketUser[]) {
  return users.filter(
    (u) =>
      (t.email && (u.email ?? "").toLowerCase() === t.email.toLowerCase()) ||
      (t.memberId && u.memberId === t.memberId.toUpperCase()) ||
      (digits(t.phone).length === 10 && digits(u.phone) === digits(t.phone)),
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = statusInfo(status);
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.tone}`}>{s.label}</span>;
}

function NewTicketDialog({ me, admins, users, onClose }: { me: AppUser; admins: TicketUser[]; users: TicketUser[]; onClose: () => void }) {
  const [f, setF] = useState({ name: "", email: "", phone: "", memberId: "", category: "forgot-password" as TicketCategory, message: "", assignee: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  // Pick an existing learner to fill in their details (and link the ticket to their account).
  const [lookup, setLookup] = useState("");
  const suggestions = lookup.trim() ? users.filter((u) => matchesSearch(lookup, u.name, u.email, u.memberId, u.phone)).slice(0, 5) : [];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (f.name.trim().length < 2) return setError("Enter the person's name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return setError("Enter a valid email address.");
    if (f.message.trim().length < 5) return setError("Describe the request.");
    setSaving(true);
    setError("");
    try {
      const account = users.find((u) => (u.email ?? "").toLowerCase() === f.email.trim().toLowerCase());
      const assignee = admins.find((a) => a.uid === f.assignee);
      setDone(
        await createTicket(
          { ...f, ...(account ? { uid: account.uid } : {}) },
          { uid: me.uid, name: me.name },
          assignee ? { uid: assignee.uid, name: assignee.name } : undefined,
        ),
      );
    } catch (err) {
      console.error("Could not create ticket", err);
      setError("Couldn't create the ticket. Check your connection and Firestore rules.");
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <Dialog title="Ticket created" onClose={onClose}>
        <p className="mt-4 text-sm text-slate-600">
          Ticket <span className="font-mono font-bold text-forest-800">{done}</span> is in the list
          {f.assignee ? ` and assigned to ${admins.find((a) => a.uid === f.assignee)?.name}` : ""}.
        </p>
        <button type="button" onClick={onClose} className="mt-6 w-full rounded-full bg-forest-700 py-3 text-sm font-semibold text-white hover:bg-forest-600">
          Done
        </button>
      </Dialog>
    );
  }

  return (
    <Dialog title="New ticket" onClose={onClose}>
      <form onSubmit={submit} noValidate className="mt-4 space-y-3">
        <div className="relative">
          <SearchBox value={lookup} onChange={setLookup} placeholder="Find a user to fill in (name, email, ID, phone)" />
          {suggestions.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-2xl border border-forest-100 bg-white shadow-xl">
              {suggestions.map((u) => (
                <li key={u.uid}>
                  <button
                    type="button"
                    onClick={() => {
                      setF((x) => ({ ...x, name: u.name, email: u.email, phone: u.phone ?? "", memberId: u.memberId ?? "" }));
                      setLookup("");
                    }}
                    className="block w-full px-4 py-2 text-left text-sm hover:bg-forest-50"
                  >
                    <span className="font-semibold text-forest-950">{u.name}</span> <span className="font-mono text-xs text-forest-700">{u.memberId}</span>
                    <span className="block text-xs text-slate-500">{u.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Full name" aria-label="Full name" className={input} />
          <input value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="Email" aria-label="Email" className={input} />
          <input value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Mobile (optional)" aria-label="Mobile" className={input} />
          <input value={f.memberId} onChange={(e) => set("memberId", e.target.value)} placeholder="Student / Tutor ID (optional)" aria-label="Member ID" className={input} />
        </div>
        <select value={f.category} onChange={(e) => set("category", e.target.value as TicketCategory)} aria-label="Category" className={input}>
          <optgroup label="Learners">
            {ticketCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Tutors & staff">
            {staffCategories.slice(0, -1).map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </optgroup>
        </select>
        <textarea value={f.message} onChange={(e) => set("message", e.target.value)} rows={3} placeholder="What's needed?" aria-label="Details" className={`${input} resize-none`} />
        <select value={f.assignee} onChange={(e) => set("assignee", e.target.value)} aria-label="Assign to" className={input}>
          <option value="">Assign later</option>
          <AssigneeOptions people={admins} me={me} />
        </select>
        {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 rounded-full border border-forest-200 py-3 text-sm font-semibold text-slate-700 hover:bg-forest-50">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="flex-1 rounded-full bg-forest-700 py-3 text-sm font-semibold text-white hover:bg-forest-600 disabled:opacity-60">
            {saving ? "Creating…" : "Create ticket"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

/**
 * One ticket, opened. "manage" (admins, ticket handlers): assign, status, updates, account help.
 * "assignee" (the tutor / employee it was assigned to): status and updates only.
 */
export function TicketDetail({
  t,
  me,
  admins = [],
  users = [],
  mode = "manage",
}: {
  t: Ticket;
  me: AppUser;
  admins?: TicketUser[];
  users?: TicketUser[];
  mode?: "manage" | "assignee";
}) {
  const manage = mode === "manage";
  const [status, setStatus] = useState<TicketStatus>(t.status);
  const [settingFor, setSettingFor] = useState<TicketUser | null>(null);
  const [assignee, setAssignee] = useState(t.assignedTo ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const accounts = matchingAccounts(t, users);
  const meRef = { uid: me.uid, name: me.name };

  const save = async () => {
    const assigneeChanged = manage && assignee !== (t.assignedTo ?? "");
    if (!assigneeChanged && status === t.status && !note.trim()) return setMsg("Change the status or assignee, or write an update.");
    setBusy(true);
    setMsg("");
    try {
      const a = admins.find((x) => x.uid === assignee);
      await updateTicket(t.id, meRef, {
        text: note,
        ...(status !== t.status ? { status } : {}),
        ...(assigneeChanged ? { assignee: a ? { uid: a.uid, name: a.name } : null } : {}),
      });
      setNote("");
      setMsg("Saved.");
    } catch (err) {
      console.error("Could not update ticket", err);
      setMsg("Couldn't save. Check your connection and Firestore rules.");
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async (u: TicketUser) => {
    if (!window.confirm(`Email a password reset link to ${u.email}? ${u.name} chooses the new password from that link.`)) return;
    setBusy(true);
    setMsg("");
    try {
      await resetPassword(u.email);
      await updateTicket(t.id, meRef, { text: `Password reset link emailed to ${u.email}.` });
      setMsg(`Reset link sent to ${u.email}.`);
    } catch (err) {
      console.error("Could not send reset", err);
      setMsg("Couldn't send the reset email. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const shareId = async (u: TicketUser) => {
    if (!u.memberId) return;
    await navigator.clipboard?.writeText(u.memberId).catch(() => {});
    setBusy(true);
    try {
      await updateTicket(t.id, meRef, { text: `Confirmed the member ID ${u.memberId} for ${u.name}.` });
      setMsg(`${u.memberId} copied. Share it with ${u.name} after confirming it's them.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 grid gap-5 rounded-2xl bg-forest-50/60 p-4 lg:grid-cols-2">
      <div className="space-y-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-slate-500">Email</dt>
          <dd className="break-all font-medium text-forest-950">
            <a href={`mailto:${t.email}`} className="hover:text-forest-600">
              {t.email}
            </a>
          </dd>
          {t.phone && (
            <>
              <dt className="text-slate-500">Mobile</dt>
              <dd className="font-medium text-forest-950">
                <a href={`tel:${t.phone}`}>{t.phone}</a>
              </dd>
            </>
          )}
          {t.memberId && (
            <>
              <dt className="text-slate-500">ID given</dt>
              <dd className="font-mono font-semibold text-forest-700">{t.memberId}</dd>
            </>
          )}
          <dt className="text-slate-500">Raised</dt>
          <dd className="text-forest-950">
            {t.createdAt ? when.format(t.createdAt.toDate()) : "Just now"} ·{" "}
            {t.source === "admin" ? `by ${t.createdByName ?? "an admin"}` : t.raiserRole ? `by the ${(roleName[t.raiserRole] ?? "user").toLowerCase()}` : "by the user"}
          </dd>
          {t.fromDate && (
            <>
              <dt className="text-slate-500">{datedCategory(t.category) ? "Dates" : "Date"}</dt>
              <dd className="font-semibold text-forest-950">{dateRange(t)}</dd>
            </>
          )}
        </dl>
        <p className="whitespace-pre-line rounded-xl bg-white px-4 py-3 text-sm leading-relaxed text-slate-700">{t.message}</p>

        {manage && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-forest-600">Matching accounts</p>
          {accounts.length === 0 ? (
            <p className="mt-1 text-sm text-slate-500">No account matches this email, ID or mobile number. Ask for more details.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {accounts.map((u) => (
                <li key={u.uid} className="rounded-xl border border-forest-100 bg-white p-3 text-sm">
                  <p className="font-semibold text-forest-950">
                    {u.name} {u.memberId && <span className="font-mono text-xs text-forest-700">{u.memberId}</span>}
                    {u.status && u.status !== "active" && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">{u.status}</span>}
                  </p>
                  <p className="text-xs text-slate-500">
                    {u.email}
                    {u.phone && ` · ${u.phone}`}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {me.role === "admin" && PASSWORD_SERVICE_ON && (
                      <button type="button" disabled={busy} onClick={() => setSettingFor(u)} className="rounded-full bg-spark-500 px-3 py-1.5 text-xs font-bold text-forest-900 hover:bg-spark-400 disabled:opacity-60">
                        Set new password
                      </button>
                    )}
                    <button type="button" disabled={busy} onClick={() => sendReset(u)} className="rounded-full bg-forest-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-forest-600 disabled:opacity-60">
                      Send password reset email
                    </button>
                    {u.memberId && (
                      <button type="button" disabled={busy} onClick={() => shareId(u)} className="rounded-full border border-forest-200 px-3 py-1.5 text-xs font-semibold text-forest-700 hover:bg-forest-50 disabled:opacity-60">
                        Copy ID {u.memberId}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Confirm it&apos;s really them (for example by phone) before setting a password or sharing an ID. A reset email lets them choose the password themselves.
          </p>
        </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {manage ? (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-forest-900">Assigned to</span>
              <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={input}>
                <option value="">Not assigned</option>
                <AssigneeOptions people={admins} me={me} />
              </select>
            </label>
          ) : (
            <p className="text-sm">
              <span className="mb-1 block font-medium text-forest-900">Assigned to</span>
              <span className="block rounded-2xl bg-white px-3.5 py-2.5 text-slate-700">You</span>
            </p>
          )}
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-forest-900">Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as TicketStatus)} className={input}>
              {ticketStatuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Write an update (the person who raised it sees updates on their Help / Requests page)"
          className={`${input} resize-none`}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={save} disabled={busy} className="rounded-full bg-forest-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-600 disabled:opacity-60">
            {busy ? "Saving…" : "Save update"}
          </button>
          {t.status !== "closed" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setStatus("closed");
                setBusy(true);
                updateTicket(t.id, meRef, { status: "closed", text: note })
                  .then(() => setNote(""))
                  .catch(() => setMsg("Couldn't close the ticket."))
                  .finally(() => setBusy(false));
              }}
              className="rounded-full border border-forest-200 px-5 py-2.5 text-sm font-semibold text-forest-700 hover:bg-white disabled:opacity-60"
            >
              Close ticket
            </button>
          )}
          {msg && <p className="text-sm font-medium text-forest-700">{msg}</p>}
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-forest-600">History</p>
          {!t.updates?.length ? (
            <p className="mt-1 text-sm text-slate-500">No updates yet.</p>
          ) : (
            <ol className="mt-2 space-y-2 border-l-2 border-forest-100 pl-4">
              {[...t.updates].reverse().map((u, i) => (
                <li key={i} className="text-sm">
                  <p className={u.fromRaiser ? "rounded-xl bg-blue-50 px-3 py-2 text-blue-900" : "text-slate-700"}>
                    {u.fromRaiser && <span className="mr-1 text-xs font-bold uppercase tracking-wider text-blue-700">Reply ·</span>}
                    {u.text}
                  </p>
                  <p className="text-xs text-slate-400">
                    {u.byName} · {u.at?.toDate ? when.format(u.at.toDate()) : ""}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
      {settingFor && (
        <SetPasswordDialog
          user={settingFor}
          onClose={() => setSettingFor(null)}
          onDone={() => updateTicket(t.id, meRef, { text: `New password set for ${settingFor.name} by ${me.name}.` })}
        />
      )}
    </div>
  );
}

type Filter = "active" | TicketStatus | "mine" | "all";

/** Admin: support tickets (lost password / ID and other requests), assigned to admins and resolved. */
export default function AdminTickets({ me, users }: { me: AppUser; users: TicketUser[] | null }) {
  const { rows, error } = useAllTickets();
  const [filter, setFilter] = useState<Filter>("active");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const all = rows ?? [];
  const people = users ?? [];
  const admins = assignable(people);
  const count = (s: TicketStatus) => all.filter((t) => t.status === s).length;
  const mine = all.filter((t) => t.assignedTo === me.uid && isActive(t));
  const shown = all.filter(
    (t) =>
      (filter === "all" ||
        (filter === "active" ? t.status === "open" || t.status === "in-progress" : filter === "mine" ? t.assignedTo === me.uid : t.status === filter)) &&
      matchesSearch(query, ticketRef(t.id), t.name, t.email, t.phone, t.memberId, categoryLabel(t.category), t.message, t.assignedName),
  );
  const chips: { id: Filter; label: string }[] = [
    { id: "active", label: `Open & in progress (${count("open") + count("in-progress")})` },
    { id: "mine", label: `Assigned to me (${mine.length})` },
    ...ticketStatuses.map((s) => ({ id: s.id as Filter, label: `${s.label} (${count(s.id)})` })),
    { id: "all", label: `All (${all.length})` },
  ];

  return (
    <div className="space-y-6">
      <StatTiles
        stats={[
          { label: "Open", value: rows === null ? "—" : count("open"), icon: TicketIcon },
          { label: "In progress", value: rows === null ? "—" : count("in-progress"), icon: ClockIcon },
          { label: "Assigned to me", value: rows === null ? "—" : mine.length, icon: UsersIcon },
          { label: "Resolved", value: rows === null ? "—" : count("resolved") + count("closed"), icon: CheckIcon },
        ]}
      />
      <Card>
        <CardTitle
          title="Tickets"
          action={
            <button type="button" onClick={() => setCreating(true)} className="rounded-full bg-forest-700 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-forest-700/20 hover:bg-forest-600">
              + New ticket
            </button>
          }
        />
        <p className="mt-1 text-sm text-slate-500">
          Requests from learners (lost password or ID, payments, courses) and from tutors and staff (leave, classes, transfers, suggestions, reports). Assign each one
          to an admin, employee or tutor, post updates and close it when done.
        </p>
        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {chips.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={filter === c.id}
                onClick={() => setFilter(c.id)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${filter === c.id ? "bg-forest-700 text-white" : "bg-forest-50 text-forest-800 hover:bg-forest-100"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <SearchBox value={query} onChange={setQuery} placeholder="Search ticket no., name, email, ID" className="lg:w-80" />
        </div>
        {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
        {rows === null ? (
          <p className="mt-6 text-sm text-slate-500">Loading tickets…</p>
        ) : shown.length === 0 ? (
          <EmptyState icon={TicketIcon} title={all.length ? "No tickets match" : "No tickets yet"}>
            Learners raise tickets from the Help page or the login page.
          </EmptyState>
        ) : (
          <ul className="mt-5 space-y-3">
            {shown.map((t) => (
              <li key={t.id} className={`rounded-2xl border p-4 ${t.status === "open" && !t.assignedTo ? "border-blue-200 bg-blue-50/40" : "border-forest-100 bg-white"}`}>
                <button type="button" onClick={() => setOpen(open === t.id ? null : t.id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 text-left" aria-expanded={open === t.id}>
                  <span className="font-mono text-xs font-bold text-forest-700">{ticketRef(t.id)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-forest-950">
                      {t.name} {t.memberId && <span className="font-mono text-xs text-forest-600">{t.memberId}</span>}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {t.raiserRole && t.raiserRole !== "student" && <span className="mr-1 rounded-full bg-forest-100 px-2 py-0.5 font-semibold text-forest-800">{roleName[t.raiserRole]}</span>}
                      {categoryLabel(t.category)}
                      {t.fromDate && ` (${dateRange(t)})`} · {t.createdAt ? when.format(t.createdAt.toDate()) : "Just now"}
                    </span>
                  </span>
                  <span className="text-xs text-slate-500">{t.assignedName ? `→ ${t.assignedName}` : <span className="font-semibold text-blue-700">Unassigned</span>}</span>
                  <StatusBadge status={t.status} />
                </button>
                {open === t.id && <TicketDetail t={t} me={me} admins={admins} users={people} />}
              </li>
            ))}
          </ul>
        )}
      </Card>
      {creating && <NewTicketDialog me={me} admins={admins} users={people} onClose={() => setCreating(false)} />}
    </div>
  );
}
