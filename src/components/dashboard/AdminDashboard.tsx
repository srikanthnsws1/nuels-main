"use client";

import { collection, doc, getDocs, onSnapshot, serverTimestamp, updateDoc, type Timestamp } from "firebase/firestore";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AwardIcon, BookIcon, BriefcaseIcon, CartIcon, GraduationIcon, GridIcon, ImageIcon, InboxIcon, LayoutIcon, MailIcon, PlayIcon, SearchIcon, ShieldIcon, StarIcon, TicketIcon, UsersIcon } from "../icons";
import { AdminCertificates, AdminGallery, AdminJobs } from "./AdminCompany";
import AdminEnquiries from "./AdminEnquiries";
import AdminHomeContent from "./AdminHomeContent";
import AdminTickets from "./AdminTickets";
import AdminQuizReports from "./AdminQuizReports";
import { CoursesCard } from "./AdminCourses";
import { openCourseContent } from "./AdminCourseContent";
import { CourseContentCard, LearnersCard } from "./AdminLearning";
import { OrdersCard, PaymentDetailsCard } from "./AdminPayments";
import { EmployeesCard } from "./AdminStaff";
import DashboardShell, { type Section } from "./DashboardShell";
import Dialog from "./Dialog";
import InboxPage from "./Inbox";
import SetPasswordDialog, { PASSWORD_SERVICE_ON } from "./SetPasswordDialog";
import { Card, CardTitle, EmptyState, SearchBox, StatTiles, WelcomeBanner, matchesSearch } from "./ui";
import { studyClassById, studyClassGroups } from "@/data/dailyQuiz";
import { authErrorMessage, greetingName, roleLabel, roles, syncLoginId, useAuth, type AppUser, type Role } from "@/lib/auth";
import { useAdminBadges } from "@/lib/badges";
import { db } from "@/lib/firebase";
import { passwordRules } from "@/lib/password";
import { createAccount } from "@/lib/staff";
import { claimIfFree, emailKey, nameKey, phoneKey, releaseClaims, syncClaims } from "@/lib/unique";

const sections: Section[] = [
  { id: "overview", label: "Overview", icon: GridIcon },
  { id: "inbox", label: "Inbox", icon: InboxIcon },
  { id: "orders", label: "Payments", icon: CartIcon },
  { id: "users", label: "Users", icon: UsersIcon },
  { id: "employees", label: "Employees", icon: BriefcaseIcon },
  { id: "payment-details", label: "Payment Details", icon: ShieldIcon },
  { id: "learners", label: "Learners", icon: GraduationIcon },
  { id: "certificates", label: "Completions & Certificates", icon: AwardIcon },
  { id: "daily-quiz", label: "Daily Quiz", icon: StarIcon },
  { id: "tickets", label: "Tickets", icon: TicketIcon },
  { id: "enquiries", label: "Enquiries", icon: MailIcon },
  { id: "courses", label: "Courses", icon: BookIcon },
  { id: "course-content", label: "Videos & Live Classes", icon: PlayIcon },
  { id: "website", label: "Website content", icon: LayoutIcon },
  { id: "jobs", label: "Job openings", icon: BriefcaseIcon },
  { id: "gallery", label: "Gallery", icon: ImageIcon },
];

type UserRow = { uid: string; name: string; email: string; phone?: string; role: Role; designation?: string; status?: AccountStatus; requestedRole?: string; memberId?: string; institution?: string; city?: string; district?: string; state?: string; studyClass?: string; createdAt?: Timestamp };

type AccountStatus = "active" | "inactive" | "removed";
type AccountAction = "activate" | "deactivate" | "reactivate" | "remove";

/** What an admin can do to an account in each state, and the state each action leads to. */
const actionsFor: Record<AccountStatus, AccountAction[]> = {
  active: ["deactivate", "remove"],
  inactive: ["reactivate", "remove"],
  removed: ["activate"],
};
const actionLabel: Record<AccountAction, string> = { activate: "Activate", deactivate: "Deactivate", reactivate: "Reactivate", remove: "Remove user" };
const actionResult: Record<AccountAction, AccountStatus> = { activate: "active", deactivate: "inactive", reactivate: "active", remove: "removed" };
const statusLabel: Record<AccountStatus, string> = { active: "Active", inactive: "Inactive", removed: "Removed" };
const statusOf = (u: { status?: AccountStatus }): AccountStatus => u.status ?? "active";

function confirmText(action: AccountAction, name: string) {
  switch (action) {
    case "deactivate":
      return `Deactivate ${name}? They'll be signed out and can't log in until you reactivate them. Their courses and records are kept.`;
    case "reactivate":
      return `Reactivate ${name}? They'll be able to log in again.`;
    case "activate":
      return `Activate ${name}? Their account comes back with its courses and records, and they can log in again.`;
    case "remove":
      return `Remove ${name}? They'll be signed out, can't log in, and won't appear in user lists, learner lists or counts. Payments and records are kept, and you can activate them again from the "Removed" filter.`;
  }
}

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

const addInput =
  "w-full rounded-2xl border border-forest-100 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-forest-300";

/** Creates a student, tutor or admin login with a password the admin shares with them. */
function AddUserModal({ onClose }: { onClose: () => void }) {
  const [f, setF] = useState({ name: "", email: "", phone: "", role: "student" as Exclude<Role, "employee">, password: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ memberId: string } | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (f.name.trim().length < 2) return setError("Enter the full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return setError("Enter a valid email address.");
    if (f.phone.trim() && !/^(\+91[\s-]?)?[6-9]\d{9}$/.test(f.phone.replace(/\s/g, ""))) return setError("Enter a valid 10-digit mobile number, or leave it blank.");
    if (!passwordRules.every((r) => r.test(f.password))) return setError("The password needs 8+ characters with an uppercase letter, a number and a special character.");
    if (f.password !== f.confirm) return setError("The passwords don't match.");
    setSaving(true);
    setError("");
    try {
      const profile = { name: f.name.trim(), ...(f.phone.trim() ? { phone: f.phone.replace(/\s/g, "") } : {}), role: f.role };
      setCreated(await createAccount(f.email, f.password, profile, f.role === "mentor" ? "T" : "S"));
    } catch (err) {
      console.error("Could not create user", err);
      const code = (err as { code?: string }).code ?? "";
      setError(code.startsWith("auth/") ? authErrorMessage(err) : "Couldn't create the user. Check your connection and Firestore rules.");
    } finally {
      setSaving(false);
    }
  };

  if (created) {
    return (
      <Dialog title="User created" onClose={onClose}>
        <p className="mt-4 text-sm text-slate-600">
          <strong>{f.name.trim()}</strong> can now log in at <strong>nuelsmart.com/login</strong> with <strong>{f.email.trim()}</strong> and the
          password you set. Their ID is <span className="font-mono font-semibold text-forest-700">{created.memberId}</span>.
        </p>
        <button type="button" onClick={onClose} className="mt-6 w-full rounded-full bg-forest-700 py-3 text-sm font-semibold text-white hover:bg-forest-600">
          Done
        </button>
      </Dialog>
    );
  }

  return (
    <Dialog title="Add a user" onClose={onClose}>
      <p className="mt-1 text-sm text-slate-500">Creates a login. To add company staff, use Employees instead.</p>
      <form onSubmit={submit} noValidate className="mt-5 space-y-4">
        {(
          [
            ["name", "Full name", "text", "e.g. Rahul Sharma"],
            ["email", "Login email", "email", "rahul@example.com"],
            ["phone", "Mobile number (optional)", "tel", "98765 43210"],
          ] as const
        ).map(([k, label, type, placeholder]) => (
          <div key={k}>
            <label htmlFor={`add-${k}`} className="mb-1.5 block text-sm font-medium text-forest-900">
              {label}
            </label>
            <input id={`add-${k}`} type={type} value={f[k]} placeholder={placeholder} onChange={(e) => set(k, e.target.value)} className={addInput} />
          </div>
        ))}
        <div>
          <label htmlFor="add-role" className="mb-1.5 block text-sm font-medium text-forest-900">
            Account role
          </label>
          <select id="add-role" value={f.role} onChange={(e) => set("role", e.target.value as typeof f.role)} className={addInput}>
            <option value="student">Student / Learner</option>
            <option value="mentor">Tutor / Mentor</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="add-password" className="mb-1.5 block text-sm font-medium text-forest-900">
              Password
            </label>
            <input id="add-password" type="password" autoComplete="new-password" value={f.password} onChange={(e) => set("password", e.target.value)} className={addInput} />
          </div>
          <div>
            <label htmlFor="add-confirm" className="mb-1.5 block text-sm font-medium text-forest-900">
              Confirm password
            </label>
            <input id="add-confirm" type="password" autoComplete="new-password" value={f.confirm} onChange={(e) => set("confirm", e.target.value)} className={addInput} />
          </div>
        </div>
        <p className="text-xs text-slate-500">8+ characters, with an uppercase letter, a number and a special character.</p>
        {error && (
          <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 rounded-full border border-forest-200 py-3 text-sm font-semibold text-slate-700 hover:bg-forest-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-full bg-forest-700 py-3 text-sm font-semibold text-white shadow-md shadow-forest-700/20 hover:bg-forest-600 disabled:opacity-60"
          >
            {saving ? "Creating…" : "Create login"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function UsersCard({
  me,
  users,
  error,
  onRoleChange,
  onStatusChange,
}: {
  me: AppUser;
  users: UserRow[] | null;
  error: string;
  onRoleChange: (uid: string, role: Role) => Promise<void>;
  onStatusChange: (uid: string, status: AccountStatus) => Promise<void>;
}) {
  const [filter, setFilter] = useState<Role | "all" | "removed" | "duplicates">("all");
  const [query, setQuery] = useState("");
  const [studyClass, setStudyClass] = useState("all");
  const [saving, setSaving] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // Removed accounts only show under their own filter.
  const removedCount = (users ?? []).filter((u) => statusOf(u) === "removed").length;
  const byClass = filter === "all" || filter === "student";
  // Accounts sharing a name, mobile number or email with another account (same rules as sign-up).
  const dupes = useMemo(() => {
    const live = (users ?? []).filter((u) => statusOf(u) !== "removed");
    const keys = [
      ["name", (u: UserRow) => nameKey(u.name)],
      ["mobile", (u: UserRow) => phoneKey(u.phone)],
      ["email", (u: UserRow) => emailKey(u.email)],
    ] as const;
    const why = new Map<string, string[]>();
    const group = new Map<string, string>();
    for (const [label, key] of keys) {
      const seen = new Map<string, UserRow[]>();
      for (const u of live) {
        const k = key(u);
        if (k) seen.set(k, [...(seen.get(k) ?? []), u]);
      }
      for (const [k, list] of seen)
        if (list.length > 1)
          for (const u of list) {
            why.set(u.uid, [...new Set([...(why.get(u.uid) ?? []), label])]);
            if (!group.has(u.uid)) group.set(u.uid, `${label}:${k}`);
          }
    }
    return { why, group };
  }, [users]);
  const visible = (users ?? []).filter(
    (u) =>
      (filter === "removed"
        ? statusOf(u) === "removed"
        : filter === "duplicates"
          ? dupes.why.has(u.uid)
          : statusOf(u) !== "removed" && (filter === "all" || u.role === filter)) &&
      (!byClass || studyClass === "all" || (studyClass === "none" ? u.role === "student" && !u.studyClass : u.studyClass === studyClass)) &&
      matchesSearch(query, u.name, u.email, u.memberId, u.phone, u.institution, u.city, u.district, u.state, studyClassById(u.studyClass)?.label),
  );
  // Duplicates sit next to each other, oldest account first (that's usually the one to keep).
  if (filter === "duplicates")
    visible.sort(
      (a, b) =>
        (dupes.group.get(a.uid) ?? "").localeCompare(dupes.group.get(b.uid) ?? "") || (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0),
    );
  // How many students are in each class, for the class drop-down.
  const classCount = (id: string) => (users ?? []).filter((u) => statusOf(u) !== "removed" && u.role === "student" && (id === "none" ? !u.studyClass : u.studyClass === id)).length;

  const change = async (uid: string, role: Role) => {
    setSaving(uid);
    setSaveError("");
    try {
      await onRoleChange(uid, role);
    } catch {
      setSaveError("Couldn't update that role. Check your connection and Firestore rules.");
    } finally {
      setSaving(null);
    }
  };

  const [passwordFor, setPasswordFor] = useState<UserRow | null>(null);
  const runAction = async (u: UserRow, action: AccountAction) => {
    if (!window.confirm(confirmText(action, u.name))) return;
    setToggling(u.uid);
    setSaveError("");
    try {
      await onStatusChange(u.uid, actionResult[action]);
    } catch {
      setSaveError("Couldn't update that account. Check your connection and Firestore rules.");
    } finally {
      setToggling(null);
    }
  };

  return (
    <>
      <Card id="users">
        <CardTitle
          title="Users"
          action={
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-forest-700 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-forest-700/20 transition hover:bg-forest-600"
            >
              + Add User
            </button>
          }
        />

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {dupes.why.size > 0 && (
              <button
                type="button"
                onClick={() => setFilter("duplicates")}
                aria-pressed={filter === "duplicates"}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  filter === "duplicates" ? "bg-amber-500 text-white" : "border border-amber-200 text-amber-700 hover:bg-amber-50"
                }`}
              >
                Duplicates ({dupes.why.size})
              </button>
            )}
            {(["all", ...roles] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setFilter(r)}
                aria-pressed={filter === r}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  filter === r ? "bg-forest-700 text-white" : "border border-forest-100 text-slate-600 hover:bg-forest-50"
                }`}
              >
                {r === "all" ? "All" : `${roleLabel[r]}s`}
              </button>
            ))}
            {removedCount > 0 && (
              <button
                type="button"
                onClick={() => setFilter("removed")}
                aria-pressed={filter === "removed"}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  filter === "removed" ? "bg-red-600 text-white" : "border border-red-100 text-red-600 hover:bg-red-50"
                }`}
              >
                Removed ({removedCount})
              </button>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {byClass && (
              <select
                value={studyClass}
                onChange={(e) => setStudyClass(e.target.value)}
                aria-label="Filter students by class"
                className="rounded-full border border-forest-100 bg-white px-4 py-2.5 text-sm font-medium text-forest-900 outline-none focus:border-forest-300"
              >
                <option value="all">All classes / courses</option>
                {studyClassGroups.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label} ({classCount(o.id)})
                      </option>
                    ))}
                  </optgroup>
                ))}
                <option value="none">Class not set ({classCount("none")})</option>
              </select>
            )}
            <SearchBox value={query} onChange={setQuery} placeholder="Search name, email, ID, phone, school" className="sm:w-72" />
          </div>
        </div>
        {(query.trim() || (byClass && studyClass !== "all")) && users && (
          <p className="mt-3 text-sm text-slate-500">
            {visible.length} {visible.length === 1 ? "user" : "users"} found
          </p>
        )}

        {(error || saveError) && <p className="mt-4 text-sm font-medium text-red-600">{error || saveError}</p>}

        {users === null && !error ? (
          <p className="mt-6 text-sm text-slate-500">Loading users…</p>
        ) : visible.length === 0 ? (
          <EmptyState icon={UsersIcon} title={users?.length ? "No users match" : "No users yet"} />
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold">Email</th>
                  <th className="pb-3 font-semibold">Joined</th>
                  <th className="pb-3 font-semibold">Role</th>
                  <th className="pb-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest-100">
                {visible.map((u) => (
                  <tr key={u.uid}>
                    <td className="py-3 pr-4 font-semibold text-forest-950">
                      {u.name}
                      {u.uid === me.uid && <span className="ml-2 text-xs font-medium text-slate-400">(you)</span>}
                      {statusOf(u) !== "active" && (
                        <span
                          className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            statusOf(u) === "removed" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {statusLabel[statusOf(u)]}
                        </span>
                      )}
                      {dupes.why.has(u.uid) && (
                        <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          Same {dupes.why.get(u.uid)!.join(" + ")}
                        </span>
                      )}
                      {filter === "duplicates" && u.phone && <span className="block text-xs font-normal text-slate-500">Mobile {u.phone}</span>}
                      {(u.memberId || u.institution || u.studyClass) && (
                        <span className="block text-xs font-normal text-slate-500">
                          {u.memberId && <span className="font-mono font-semibold text-forest-700">{u.memberId}</span>}
                          {u.studyClass && (
                            <span className="ml-1.5 rounded-full bg-violet-50 px-2 py-0.5 font-semibold text-violet-700">{studyClassById(u.studyClass)?.label ?? u.studyClass}</span>
                          )}
                          {(u.memberId || u.studyClass) && u.institution && " · "}
                          {[u.institution, u.city, u.district, u.state].filter(Boolean).join(", ")}
                        </span>
                      )}
                      {u.role === "student" && u.requestedRole === "mentor" && (
                        <span className="ml-2 rounded-full bg-spark-500/25 px-2 py-0.5 text-[11px] font-bold text-forest-800">
                          Mentor application
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{u.email}</td>
                    <td className="py-3 pr-4 text-slate-500">{u.createdAt ? dateFormat.format(u.createdAt.toDate()) : "—"}</td>
                    <td className="py-3 pr-4">
                      <select
                        value={u.role}
                        onChange={(e) => change(u.uid, e.target.value as Role)}
                        disabled={u.uid === me.uid || saving === u.uid || statusOf(u) === "removed"}
                        aria-label={`Role for ${u.name}`}
                        className="rounded-full border border-forest-100 bg-white px-3 py-1.5 text-sm font-medium text-forest-900 outline-none focus:border-forest-300 disabled:opacity-60"
                      >
                        {roles.map((r) => (
                          <option key={r} value={r}>
                            {roleLabel[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 text-right">
                      {u.uid !== me.uid && (
                        <select
                          value=""
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "password") setPasswordFor(u);
                            else if (v) runAction(u, v as AccountAction);
                          }}
                          disabled={toggling === u.uid}
                          aria-label={`Account actions for ${u.name}`}
                          className={`rounded-full border bg-white px-3 py-1.5 text-sm font-medium outline-none transition focus:border-forest-300 disabled:opacity-60 ${
                            statusOf(u) === "active"
                              ? "border-forest-100 text-forest-800"
                              : statusOf(u) === "inactive"
                                ? "border-slate-200 text-slate-600"
                                : "border-red-200 text-red-600"
                          }`}
                        >
                          <option value="" hidden>
                            {toggling === u.uid ? "Saving…" : `${statusLabel[statusOf(u)]} · Actions`}
                          </option>
                          {PASSWORD_SERVICE_ON && statusOf(u) !== "removed" && <option value="password">Set new password</option>}
                          {actionsFor[statusOf(u)].map((a) => (
                            <option key={a} value={a}>
                              {actionLabel[a]}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showAddModal && <AddUserModal onClose={() => setShowAddModal(false)} />}
      {passwordFor && <SetPasswordDialog user={passwordFor} onClose={() => setPasswordFor(null)} />}
    </>
  );
}

/** Overview list opened from a count tile, with its own search. */
type OverviewList = "all" | "student" | "mentor" | "employee";

function OverviewUserList({
  list,
  users,
  me,
  onClose,
}: {
  list: OverviewList;
  users: UserRow[] | null;
  me: AppUser;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const title = { all: "All users", student: "Students", mentor: "Mentors", employee: "Employees" }[list];
  const rows = (users ?? []).filter((u) => list === "all" || u.role === list);
  const q = query.trim().toLowerCase();
  const visible = q
    ? rows.filter((u) =>
        [u.name, u.email, u.memberId, u.phone, u.designation, u.institution, u.city, u.district, u.state, roleLabel[u.role]]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      )
    : rows;

  return (
    <Card id="overview-list">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold tracking-tight text-forest-950">
          {title} <span className="text-slate-400">· {rows.length}</span>
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-3 rounded-full border border-forest-100 bg-white px-4 py-2 transition focus-within:border-forest-300 sm:w-80 sm:flex-none">
            <SearchIcon className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              type="search"
              autoFocus
              placeholder={`Search ${title.toLowerCase()}: name, email, ID, phone…`}
              aria-label={`Search ${title.toLowerCase()}`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full min-w-0 bg-transparent py-1 text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-forest-50 hover:text-forest-700"
          >
            Hide
          </button>
        </div>
      </div>

      {q && (
        <p className="mt-3 text-sm text-slate-500">
          {visible.length} result{visible.length === 1 ? "" : "s"} for &ldquo;{query.trim()}&rdquo;
        </p>
      )}

      {users === null ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : visible.length === 0 ? (
        <EmptyState icon={UsersIcon} title={rows.length ? "No matches" : `No ${title.toLowerCase()} yet`} />
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="pb-3 font-semibold">Name</th>
                <th className="pb-3 font-semibold">Email</th>
                <th className="pb-3 font-semibold">Mobile</th>
                <th className="pb-3 font-semibold">{list === "employee" ? "Designation" : list === "all" ? "Role" : "School / Location"}</th>
                <th className="pb-3 font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-forest-100">
              {visible.map((u) => (
                <tr key={u.uid}>
                  <td className="py-3 pr-4 font-semibold text-forest-950">
                    {u.name}
                    {u.uid === me.uid && <span className="ml-2 text-xs font-medium text-slate-400">(you)</span>}
                    {u.status === "inactive" && (
                      <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">Inactive</span>
                    )}
                    {u.memberId && <span className="block font-mono text-xs font-semibold text-forest-700">{u.memberId}</span>}
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{u.email}</td>
                  <td className="py-3 pr-4 text-slate-600">{u.phone || "—"}</td>
                  <td className="py-3 pr-4 text-slate-600">
                    {list === "employee"
                      ? u.designation || "—"
                      : list === "all"
                        ? roleLabel[u.role]
                        : [u.institution, u.city, u.district, u.state].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="py-3 text-slate-500">{u.createdAt ? dateFormat.format(u.createdAt.toDate()) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function AdminContent({ me, page }: { me: AppUser; page: string }) {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [error, setError] = useState("");
  // The first snapshot can come from the local cache and hold only the admin's own profile;
  // the one-off backfills below must wait for the full list from the server.
  const [fromServer, setFromServer] = useState(false);

  useEffect(
    () =>
      onSnapshot(
        collection(db, "users"),
        (snap) => {
          const rows = snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as UserRow);
          rows.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
          setUsers(rows);
          if (!snap.metadata.fromCache) setFromServer(true);
        },
        () => setError("Couldn't load users. Make sure the Firestore rules are deployed."),
      ),
    [],
  );

  // Accounts made before ID login existed: give each one its member-ID -> email record, once.
  const backfilled = useRef(false);
  useEffect(() => {
    if (!users || !fromServer || backfilled.current) return;
    backfilled.current = true;
    getDocs(collection(db, "loginIds"))
      .then((snap) => {
        const have = new Map(snap.docs.map((d) => [d.id, d.data().email as string]));
        const missing = users.filter((u) => u.memberId && u.email && statusOf(u) !== "removed" && have.get(u.memberId) !== u.email);
        return Promise.all(missing.map((u) => syncLoginId({ uid: u.uid, email: u.email, memberId: u.memberId })));
      })
      .catch((err) => console.warn("Couldn't backfill login IDs", err));
    // Names and phone numbers of older accounts, so new sign-ups can't reuse them.
    syncClaims(users).catch((err) => console.warn("Couldn't backfill name / phone / email checks", err));
  }, [users, fromServer]);

  const setRole = (uid: string, role: Role) => updateDoc(doc(db, "users", uid), { role });
  const setStatus = async (uid: string, status: AccountStatus) => {
    await updateDoc(doc(db, "users", uid), { status, statusChangedAt: serverTimestamp() });
    // A removed account no longer holds its name and phone number; restoring it claims them again if still free.
    const u = users?.find((x) => x.uid === uid);
    if (u && status === "removed") await releaseClaims(uid, u).catch((err) => console.warn("Couldn't free name / phone", err));
    if (u && status === "active") await claimIfFree(uid, u).catch((err) => console.warn("Couldn't claim name / phone", err));
  };

  // Removed accounts are left out of counts and lists everywhere except the Users page's "Removed" filter.
  const current = users?.filter((u) => statusOf(u) !== "removed") ?? null;
  const count = (role: Role) => current?.filter((u) => u.role === role).length ?? "—";
  // Overview tiles open their list below; clicking the same tile again hides it.
  const tileLists: OverviewList[] = ["all", "student", "mentor", "employee"];
  const [openList, setOpenList] = useState<OverviewList | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selectTile = (i: number) => {
    const next = openList === tileLists[i] ? null : tileLists[i];
    setOpenList(next);
    if (next) requestAnimationFrame(() => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const stats = [
    { label: "Total users", value: current?.length ?? "—", icon: UsersIcon },
    { label: "Students", value: count("student"), icon: GraduationIcon },
    { label: "Mentors", value: count("mentor"), icon: BookIcon },
    { label: "Employees", value: count("employee"), icon: BriefcaseIcon },
  ];

  // One sidebar item = one page.
  return (
    <>
      {page === "overview" && (
        <>
          <WelcomeBanner id="overview" title={<>Welcome, {greetingName(me)}!</>}>
            <p className="mt-3 text-sm leading-relaxed text-forest-100 sm:text-base">
              Manage user accounts, add students or tutors, and update platform roles.
            </p>
          </WelcomeBanner>

          <StatTiles stats={stats} onSelect={selectTile} selected={openList ? tileLists.indexOf(openList) : null} />

          {openList && (
            <div ref={listRef} className="scroll-mt-28">
              <OverviewUserList key={openList} list={openList} users={current} me={me} onClose={() => setOpenList(null)} />
            </div>
          )}
        </>
      )}

      {page === "inbox" && <InboxPage user={me} />}

      {page === "orders" && <OrdersCard me={me} />}

      {page === "users" && (
        <UsersCard
          me={me}
          users={users}
          error={error}
          onRoleChange={setRole}
          onStatusChange={setStatus}
        />
      )}

      {page === "employees" && <EmployeesCard canEdit />}

      {page === "payment-details" && <PaymentDetailsCard />}

      {page === "learners" && <LearnersCard users={current} />}

      {page === "daily-quiz" && <AdminQuizReports me={me} />}

      {page === "enquiries" && <AdminEnquiries me={me} />}

      {page === "tickets" && <AdminTickets me={me} users={users} />}

      {page === "certificates" && <AdminCertificates me={me} users={current} />}

      {page === "website" && <AdminHomeContent />}

      {page === "jobs" && <AdminJobs />}

      {page === "gallery" && <AdminGallery me={me} />}

      {page === "courses" && <CoursesCard extraMentors={(current ?? []).filter((u) => u.role === "mentor").map((u) => u.name)} onContent={openCourseContent} />}

      {page === "course-content" && <CourseContentCard canEditCourse />}
    </>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const badges = useAdminBadges(user);
  return (
    <DashboardShell role="admin" sections={sections} paged badges={badges}>
      {(user, page) => <AdminContent me={user} page={page} />}
    </DashboardShell>
  );
}
