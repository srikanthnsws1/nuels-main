"use client";

import { collection, doc, getDocs, updateDoc, type Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { BookIcon, GraduationIcon, GridIcon, SearchIcon, ShieldIcon, UsersIcon } from "../icons";
import DashboardShell, { type Section } from "./DashboardShell";
import { Card, CardTitle, EmptyState, StatTiles, WelcomeBanner, rupee } from "./ui";
import { courses } from "@/data/site";
import { roleLabel, roles, type AppUser, type Role } from "@/lib/auth";
import { db } from "@/lib/firebase";

const sections: Section[] = [
  { id: "overview", label: "Overview", icon: GridIcon },
  { id: "users", label: "Users", icon: UsersIcon },
  { id: "courses", label: "Courses", icon: BookIcon },
];

type UserRow = { uid: string; name: string; email: string; phone?: string; role: Role; createdAt?: Timestamp };

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

function UsersCard({ me, users, error, onRoleChange }: {
  me: AppUser;
  users: UserRow[] | null;
  error: string;
  onRoleChange: (uid: string, role: Role) => Promise<void>;
}) {
  const [filter, setFilter] = useState<Role | "all">("all");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");

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

  return (
    <Card id="users">
      <CardTitle title="Users" />
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
              </tr>
            </thead>
            <tbody className="divide-y divide-forest-100">
              {visible.map((u) => (
                <tr key={u.uid}>
                  <td className="py-3 pr-4 font-semibold text-forest-950">
                    {u.name}
                    {u.uid === me.uid && <span className="ml-2 text-xs font-medium text-slate-400">(you)</span>}
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{u.email}</td>
                  <td className="py-3 pr-4 text-slate-500">{u.createdAt ? dateFormat.format(u.createdAt.toDate()) : "—"}</td>
                  <td className="py-3">
                    <select
                      value={u.role}
                      onChange={(e) => change(u.uid, e.target.value as Role)}
                      // Admins can't demote themselves, so the site can't end up with no admin.
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
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

  const count = (role: Role) => users?.filter((u) => u.role === role).length ?? "—";
  const stats = [
    { label: "Total users", value: users?.length ?? "—", icon: UsersIcon },
    { label: "Students", value: count("student"), icon: GraduationIcon },
    { label: "Mentors", value: count("mentor"), icon: BookIcon },
    { label: "Admins", value: count("admin"), icon: ShieldIcon },
  ];

  return (
    <>
      <WelcomeBanner id="overview" title={<>Welcome, {me.name.split(" ")[0] || "Admin"}!</>}>
        <p className="mt-3 text-sm leading-relaxed text-forest-100 sm:text-base">
          Manage user accounts and roles. Change a user&apos;s role to give them the mentor or admin dashboard.
        </p>
      </WelcomeBanner>

      <StatTiles stats={stats} />

      <UsersCard me={me} users={users} error={error} onRoleChange={setRole} />

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
