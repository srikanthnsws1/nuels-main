"use client";

import { collection, doc, onSnapshot, updateDoc, type Timestamp } from "firebase/firestore";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { BookIcon, BriefcaseIcon, CartIcon, GraduationIcon, GridIcon, PlayIcon, SearchIcon, ShieldIcon, UsersIcon } from "../icons";
import { CoursesCard } from "./AdminCourses";
import { CourseContentCard, LearnersCard } from "./AdminLearning";
import { OrdersCard, PaymentDetailsCard } from "./AdminPayments";
import { EmployeesCard } from "./AdminStaff";
import DashboardShell, { type Section } from "./DashboardShell";
import Dialog from "./Dialog";
import { Card, CardTitle, EmptyState, StatTiles, WelcomeBanner } from "./ui";
import { authErrorMessage, greetingName, roleLabel, roles, type AppUser, type Role } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { passwordRules } from "@/lib/password";
import { createAccount } from "@/lib/staff";

const sections: Section[] = [
  { id: "overview", label: "Overview", icon: GridIcon },
  { id: "orders", label: "Payments", icon: CartIcon },
  { id: "users", label: "Users", icon: UsersIcon },
  { id: "employees", label: "Employees", icon: BriefcaseIcon },
  { id: "payment-details", label: "Payment Details", icon: ShieldIcon },
  { id: "learners", label: "Learners", icon: GraduationIcon },
  { id: "courses", label: "Courses", icon: BookIcon },
  { id: "course-content", label: "Course Videos", icon: PlayIcon },
];

type UserRow = { uid: string; name: string; email: string; phone?: string; role: Role; designation?: string; status?: "active" | "inactive"; requestedRole?: string; memberId?: string; institution?: string; city?: string; district?: string; state?: string; createdAt?: Timestamp };

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
  onStatusChange: (uid: string, status: "active" | "inactive") => Promise<void>;
}) {
  const [filter, setFilter] = useState<Role | "all">("all");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const q = query.trim().toLowerCase();
  const visible = (users ?? []).filter(
    (u) => (filter === "all" || u.role === filter) && (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)),
  );

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

  const toggleStatus = async (u: UserRow) => {
    const next = u.status === "inactive" ? "active" : "inactive";
    const question =
      next === "inactive"
        ? `Deactivate ${u.name}? They'll be signed out and can't log in until you reactivate them. Their courses and records are kept.`
        : `Reactivate ${u.name}? They'll be able to log in again.`;
    if (!window.confirm(question)) return;
    setToggling(u.uid);
    setSaveError("");
    try {
      await onStatusChange(u.uid, next);
    } catch {
      setSaveError("Couldn't update that account.");
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
          </div>
          <div className="flex items-center gap-3 rounded-full border border-forest-100 bg-white px-4 py-2 transition focus-within:border-forest-300 sm:w-72">
            <SearchIcon className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              type="search"
              placeholder="Search name or email"
              aria-label="Search users"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full min-w-0 bg-transparent py-1 text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

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
                      {u.status === "inactive" && (
                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">Inactive</span>
                      )}
                      {(u.memberId || u.institution) && (
                        <span className="block text-xs font-normal text-slate-500">
                          {u.memberId && <span className="font-mono font-semibold text-forest-700">{u.memberId}</span>}
                          {u.memberId && u.institution && " · "}
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
                        disabled={u.uid === me.uid || saving === u.uid}
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
                        <button
                          type="button"
                          onClick={() => toggleStatus(u)}
                          disabled={toggling === u.uid}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 ${
                            u.status === "inactive" ? "text-forest-700 hover:bg-forest-50" : "text-red-600 hover:bg-red-50 hover:text-red-700"
                          }`}
                        >
                          {toggling === u.uid ? "Saving…" : u.status === "inactive" ? "Reactivate" : "Deactivate"}
                        </button>
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

  useEffect(
    () =>
      onSnapshot(
        collection(db, "users"),
        (snap) => {
          const rows = snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as UserRow);
          rows.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
          setUsers(rows);
        },
        () => setError("Couldn't load users. Make sure the Firestore rules are deployed."),
      ),
    [],
  );

  const setRole = (uid: string, role: Role) => updateDoc(doc(db, "users", uid), { role });
  const setStatus = (uid: string, status: "active" | "inactive") => updateDoc(doc(db, "users", uid), { status });

  const count = (role: Role) => users?.filter((u) => u.role === role).length ?? "—";
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
    { label: "Total users", value: users?.length ?? "—", icon: UsersIcon },
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
              <OverviewUserList key={openList} list={openList} users={users} me={me} onClose={() => setOpenList(null)} />
            </div>
          )}
        </>
      )}

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

      {page === "learners" && <LearnersCard users={users} />}

      {page === "courses" && <CoursesCard extraMentors={(users ?? []).filter((u) => u.role === "mentor").map((u) => u.name)} />}

      {page === "course-content" && <CourseContentCard />}
    </>
  );
}

export default function AdminDashboard() {
  return (
    <DashboardShell role="admin" sections={sections} paged>
      {(user, page) => <AdminContent me={user} page={page} />}
    </DashboardShell>
  );
}
