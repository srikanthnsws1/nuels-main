"use client";

import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc, type Timestamp } from "firebase/firestore";
import { useEffect, useState, type FormEvent } from "react";
import { BookIcon, CartIcon, CloseIcon, GraduationIcon, GridIcon, SearchIcon, ShieldIcon, UsersIcon } from "../icons";
import { OrdersCard, PaymentDetailsCard } from "./AdminPayments";
import DashboardShell, { type Section } from "./DashboardShell";
import { Card, CardTitle, EmptyState, StatTiles, WelcomeBanner, rupee } from "./ui";
import { courses } from "@/data/site";
import { greetingName, roleLabel, roles, type AppUser, type Role } from "@/lib/auth";
import { db } from "@/lib/firebase";

const sections: Section[] = [
  { id: "overview", label: "Overview", icon: GridIcon },
  { id: "orders", label: "Payments", icon: CartIcon },
  { id: "users", label: "Users", icon: UsersIcon },
  { id: "payment-details", label: "Payment Details", icon: ShieldIcon },
  { id: "courses", label: "Courses", icon: BookIcon },
];

type UserRow = { uid: string; name: string; email: string; phone?: string; role: Role; requestedRole?: string; memberId?: string; institution?: string; city?: string; district?: string; state?: string; createdAt?: Timestamp };

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

function AddUserModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (user: UserRow) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const docRef = await addDoc(collection(db, "users"), {
        name: name.trim(),
        email: email.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        role,
        createdAt: serverTimestamp(),
      });
      onAdded({
        uid: docRef.id,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        role,
      });
      onClose();
    } catch {
      setError("Failed to create user. Verify Firestore permissions.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-forest-100 pb-4">
          <h3 className="text-lg font-bold text-forest-950">Add New User</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-forest-50 hover:text-slate-700"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-forest-900">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full rounded-xl border border-forest-100 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-forest-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-forest-900">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="rahul@example.com"
              className="w-full rounded-xl border border-forest-100 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-forest-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-forest-900">Phone (Optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9876543210"
              className="w-full rounded-xl border border-forest-100 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-forest-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-forest-900">Account Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full rounded-xl border border-forest-100 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-forest-400"
            >
              <option value="student">Student / Learner</option>
              <option value="mentor">Tutor / Mentor</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          {error && <p className="text-xs font-medium text-red-600">{error}</p>}

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-forest-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-forest-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-full bg-forest-700 py-2.5 text-sm font-semibold text-white shadow-md shadow-forest-700/20 hover:bg-forest-600 disabled:opacity-60"
            >
              {saving ? "Creating…" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UsersCard({
  me,
  users,
  error,
  onRoleChange,
  onAddUser,
  onDeleteUser,
}: {
  me: AppUser;
  users: UserRow[] | null;
  error: string;
  onRoleChange: (uid: string, role: Role) => Promise<void>;
  onAddUser: (user: UserRow) => void;
  onDeleteUser: (uid: string) => Promise<void>;
}) {
  const [filter, setFilter] = useState<Role | "all">("all");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
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

  const remove = async (uid: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove user "${name}" from the database?`)) return;
    setDeleting(uid);
    setSaveError("");
    try {
      await onDeleteUser(uid);
    } catch {
      setSaveError("Couldn't remove that user.");
    } finally {
      setDeleting(null);
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
                          onClick={() => remove(u.uid, u.name)}
                          disabled={deleting === u.uid}
                          className="rounded-full px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                        >
                          {deleting === u.uid ? "Removing…" : "Delete"}
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

      {showAddModal && <AddUserModal onClose={() => setShowAddModal(false)} onAdded={onAddUser} />}
    </>
  );
}

function AdminContent({ me }: { me: AppUser }) {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getDocs(collection(db, "users"))
      .then((snap) => {
        const rows = snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as UserRow);
        rows.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
        setUsers(rows);
      })
      .catch(() => setError("Couldn't load users. Make sure the Firestore rules are deployed."));
  }, []);

  const setRole = async (uid: string, role: Role) => {
    await updateDoc(doc(db, "users", uid), { role });
    setUsers((list) => list?.map((u) => (u.uid === uid ? { ...u, role } : u)) ?? list);
  };

  const handleAddUser = (newUser: UserRow) => {
    setUsers((list) => (list ? [newUser, ...list] : [newUser]));
  };

  const handleDeleteUser = async (uid: string) => {
    await deleteDoc(doc(db, "users", uid));
    setUsers((list) => list?.filter((u) => u.uid !== uid) ?? null);
  };

  const count = (role: Role) => users?.filter((u) => u.role === role).length ?? "—";
  const stats = [
    { label: "Total users", value: users?.length ?? "—", icon: UsersIcon },
    { label: "Students", value: count("student"), icon: GraduationIcon },
    { label: "Mentors", value: count("mentor"), icon: BookIcon },
    { label: "Admins", value: count("admin"), icon: ShieldIcon },
  ];

  return (
    <>
      <WelcomeBanner id="overview" title={<>Welcome, {greetingName(me)}!</>}>
        <p className="mt-3 text-sm leading-relaxed text-forest-100 sm:text-base">
          Manage user accounts, add students or tutors, and update platform roles.
        </p>
      </WelcomeBanner>

      <StatTiles stats={stats} />

      <OrdersCard me={me} />

      <UsersCard
        me={me}
        users={users}
        error={error}
        onRoleChange={setRole}
        onAddUser={handleAddUser}
        onDeleteUser={handleDeleteUser}
      />

      <PaymentDetailsCard />

      <Card id="courses">
        <CardTitle title="Course catalog" />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="pb-3 font-semibold">Course</th>
                <th className="pb-3 font-semibold">Mentor</th>
                <th className="pb-3 font-semibold">Level</th>
                <th className="pb-3 font-semibold">Lessons</th>
                <th className="pb-3 text-right font-semibold">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-forest-100">
              {courses.map((c) => (
                <tr key={c.slug}>
                  <td className="py-3 pr-4 font-semibold text-forest-950">{c.title}</td>
                  <td className="py-3 pr-4 text-slate-600">{c.mentor}</td>
                  <td className="py-3 pr-4 text-slate-600">{c.level}</td>
                  <td className="py-3 pr-4 text-slate-600">{c.lessons}</td>
                  <td className="py-3 text-right font-semibold text-forest-700">{rupee.format(c.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

export default function AdminDashboard() {
  return (
    <DashboardShell role="admin" sections={sections}>
      {(user) => <AdminContent me={user} />}
    </DashboardShell>
  );
}
