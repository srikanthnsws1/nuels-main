"use client";

import { collection, collectionGroup, deleteDoc, deleteField, doc, getDocs, onSnapshot, updateDoc, type Timestamp } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BookIcon, CalendarIcon, ClipboardIcon, GraduationIcon, GridIcon, SearchIcon, ShieldIcon, UsersIcon, WalletIcon } from "../icons";
import DashboardShell, { type Section } from "./DashboardShell";
import { Card, CardTitle, EmptyState, StatTiles, WelcomeBanner } from "./ui";
import { greetingName, roleLabel, roles, type AppUser, type Role } from "@/lib/auth";
import {
  courseEarnings,
  coursePath,
  getPaymentProof,
  localDate,
  reviewEnrollment,
  rupee,
  sessionWhen,
  sortSessions,
  useAllEnrollments,
  useCourses,
  type Course,
  type Enrollment,
  type LiveSession,
} from "@/lib/courses";
import { db } from "@/lib/firebase";
import { deleteMentorProfile, useAllMentorPayouts } from "@/lib/mentors";

// Admins see everything but only manage accounts and roles. Courses and sessions belong to
// mentors, so they are read-only here (firestore.rules enforces the same).
const sections: Section[] = [
  { id: "overview", label: "Overview", icon: GridIcon },
  { id: "payments", label: "Payments", icon: ShieldIcon },
  { id: "users", label: "Users", icon: UsersIcon },
  { id: "mentor-earnings", label: "Mentor Earnings", icon: WalletIcon },
  { id: "courses", label: "Courses", icon: BookIcon },
  { id: "enrollments", label: "Enrollments", icon: ClipboardIcon },
  { id: "sessions", label: "Live Sessions", icon: CalendarIcon },
];

type UserRow = { uid: string; name: string; email: string; phone?: string; role: Role; requestedRole?: string; memberId?: string; institution?: string; city?: string; district?: string; state?: string; createdAt?: Timestamp };

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

function UsersCard({
  me,
  users,
  error,
  onRoleChange,
  onApplication,
  onDeleteUser,
}: {
  me: AppUser;
  users: UserRow[] | null;
  error: string;
  onRoleChange: (uid: string, role: Role) => Promise<void>;
  onApplication: (uid: string, approve: boolean) => Promise<void>;
  onDeleteUser: (uid: string) => Promise<void>;
}) {
  const [filter, setFilter] = useState<Role | "all" | "applicants">("all");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");

  const q = query.trim().toLowerCase();
  const isApplicant = (u: UserRow) => u.role === "student" && u.requestedRole === "mentor";
  const visible = (users ?? []).filter(
    (u) =>
      (filter === "all" || (filter === "applicants" ? isApplicant(u) : u.role === filter)) &&
      (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.memberId?.toLowerCase().includes(q)),
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

  const decide = async (u: UserRow, approve: boolean) => {
    const question = approve
      ? `Approve ${u.name} (${u.email}) as a mentor? They'll be able to log in to the mentor dashboard and post courses.`
      : `Reject ${u.name}'s mentor application? Their account will stay as a regular student account.`;
    if (!window.confirm(question)) return;
    setSaving(u.uid);
    setSaveError("");
    try {
      await onApplication(u.uid, approve);
    } catch {
      setSaveError("Couldn't update that application. Check your connection and Firestore rules.");
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
        <CardTitle title="Users" />
        <p className="mt-1 text-sm text-slate-500">
          People create their own accounts by registering. New mentors can&apos;t log in to the mentor dashboard until you approve
          them here.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {(["all", ...roles, "applicants"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setFilter(r)}
                aria-pressed={filter === r}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  filter === r ? "bg-forest-700 text-white" : "border border-forest-100 text-slate-600 hover:bg-forest-50"
                }`}
              >
                {r === "all" ? "All" : r === "applicants" ? "Mentor applications" : `${roleLabel[r]}s`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 rounded-full border border-forest-100 bg-white px-4 py-2 transition focus-within:border-forest-300 sm:w-72">
            <SearchIcon className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              type="search"
              placeholder="Search name, email or ID"
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
                      {isApplicant(u) && (
                        <span className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-spark-500/25 px-2 py-0.5 text-[11px] font-bold text-forest-800">
                            Mentor verification pending
                          </span>
                          <button
                            type="button"
                            onClick={() => decide(u, true)}
                            disabled={saving === u.uid}
                            className="rounded-full bg-forest-700 px-3 py-1 text-xs font-semibold text-white transition hover:bg-forest-600 disabled:opacity-60"
                          >
                            Approve mentor
                          </button>
                          <button
                            type="button"
                            onClick={() => decide(u, false)}
                            disabled={saving === u.uid}
                            className="rounded-full px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                          >
                            Reject
                          </button>
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
    </>
  );
}

/** Each mentor's verified earnings, course by course, with the bank / UPI details to pay them. */
function MentorEarningsCard({
  users,
  courses,
  enrollments,
}: {
  users: UserRow[] | null;
  courses: Course[] | null;
  enrollments: Enrollment[] | null;
}) {
  const payouts = useAllMentorPayouts();
  const mentors = (users ?? []).filter((u) => u.role === "mentor");

  return (
    <Card id="mentor-earnings">
      <CardTitle title="Mentor earnings & payouts" />
      <p className="mt-1 text-sm text-slate-500">Verified payments per course (course price × students you approved), with each mentor&apos;s payout details.</p>
      {users === null || courses === null || enrollments === null || payouts === null ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : mentors.length === 0 ? (
        <EmptyState icon={WalletIcon} title="No approved mentors yet" />
      ) : (
        <div className="mt-5 space-y-4">
          {mentors.map((m) => {
            const rows = courseEarnings(
              courses.filter((c) => c.mentorId === m.uid),
              enrollments,
            );
            const total = rows.reduce((s, r) => s + r.earned, 0);
            const p = payouts[m.uid];
            return (
              <details key={m.uid} className="group rounded-2xl border border-forest-100 open:border-forest-300">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                  <span>
                    <span className="font-semibold text-forest-950">{m.name}</span>
                    {m.memberId && <span className="ml-2 font-mono text-xs font-semibold text-forest-700">{m.memberId}</span>}
                    <span className="block text-xs text-slate-500">
                      {rows.length} course{rows.length === 1 ? "" : "s"} · {m.email}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-lg font-bold text-forest-700">{rupee.format(total)}</span>
                    <span className="text-xs text-slate-500">earned</span>
                  </span>
                </summary>
                <div className="border-t border-forest-100 px-4 py-4">
                  {rows.length === 0 ? (
                    <p className="text-sm text-slate-500">No courses posted.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[480px] text-left text-sm">
                        <thead className="text-xs uppercase tracking-wider text-slate-400">
                          <tr>
                            <th className="pb-2 font-semibold">Course</th>
                            <th className="pb-2 font-semibold">Price</th>
                            <th className="pb-2 font-semibold">Paid students</th>
                            <th className="pb-2 text-right font-semibold">Earned</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-forest-100">
                          {rows.map((r) => (
                            <tr key={r.courseId}>
                              <td className="py-2 pr-4 text-forest-950">{r.title}</td>
                              <td className="py-2 pr-4 text-slate-600">{r.price ? rupee.format(r.price) : "Free"}</td>
                              <td className="py-2 pr-4 text-slate-600">{r.paidStudents}</td>
                              <td className="py-2 text-right font-semibold text-forest-700">{rupee.format(r.earned)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="mt-4 rounded-xl bg-forest-50/70 p-3 text-sm">
                    <p className="font-semibold text-forest-950">Payout details</p>
                    {p && (p.accountNumber || p.upiId || p.upiNumber) ? (
                      <dl className="mt-1 grid gap-x-6 gap-y-1 text-slate-600 sm:grid-cols-2">
                        {p.accountNumber && (
                          <>
                            <div>
                              <dt className="inline text-slate-400">Account: </dt>
                              <dd className="inline font-mono">{p.accountNumber}</dd>
                            </div>
                            <div>
                              <dt className="inline text-slate-400">IFSC: </dt>
                              <dd className="inline font-mono">{p.ifsc}</dd>
                            </div>
                            <div>
                              <dt className="inline text-slate-400">Holder: </dt>
                              <dd className="inline">{p.accountHolder}</dd>
                            </div>
                            <div>
                              <dt className="inline text-slate-400">Bank: </dt>
                              <dd className="inline">{p.bankName}</dd>
                            </div>
                          </>
                        )}
                        {p.upiId && (
                          <div>
                            <dt className="inline text-slate-400">UPI ID: </dt>
                            <dd className="inline font-mono">{p.upiId}</dd>
                          </div>
                        )}
                        {p.upiNumber && (
                          <div>
                            <dt className="inline text-slate-400">UPI number: </dt>
                            <dd className="inline font-mono">{p.upiNumber}</dd>
                          </div>
                        )}
                      </dl>
                    ) : (
                      <p className="mt-1 text-slate-500">The mentor hasn&apos;t added bank or UPI details yet.</p>
                    )}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/** Pending enrollments: view the student's payment screenshot, then approve or reject it. */
function PaymentsCard({ me, enrollments }: { me: AppUser; enrollments: Enrollment[] | null }) {
  const [proofs, setProofs] = useState<Record<string, string | null>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const pending = (enrollments ?? []).filter((e) => e.status === "pending");

  const showProof = async (id: string) => {
    if (id in proofs) {
      return setProofs((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
    }
    setError("");
    try {
      const image = await getPaymentProof(id);
      setProofs((p) => ({ ...p, [id]: image }));
    } catch {
      setError("Couldn't load that screenshot.");
    }
  };

  const review = async (e: Enrollment, status: "approved" | "rejected") => {
    const verb = status === "approved" ? "Approve" : "Reject";
    if (!window.confirm(`${verb} ${e.studentName}'s payment of ${rupee.format(e.amount)} for "${e.courseTitle}"?`)) return;
    setBusy(e.id);
    setError("");
    try {
      await reviewEnrollment(me, e.id, status);
    } catch {
      setError("Couldn't update that enrollment. Check your connection and Firestore rules.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card id="payments">
      <CardTitle title="Payment verification" />
      <p className="mt-1 text-sm text-slate-500">
        Students&apos; courses stay locked until you approve their payment. Rejected students are asked to contact the administration
        department and can upload a new screenshot.
      </p>
      {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
      {enrollments === null ? (
        <p className="mt-6 text-sm text-slate-500">Loading payments…</p>
      ) : pending.length === 0 ? (
        <EmptyState icon={ClipboardIcon} title="No payments waiting for verification" />
      ) : (
        <ul className="mt-5 space-y-3">
          {pending.map((e) => (
            <li key={e.id} className="rounded-2xl border border-forest-100 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-forest-950">
                    {e.studentName}
                    {e.studentMemberId && <span className="ml-2 font-mono text-xs font-semibold text-forest-700">{e.studentMemberId}</span>}
                  </p>
                  <p className="text-sm text-slate-500">
                    {e.studentEmail} · {e.courseTitle}
                  </p>
                  <p className="mt-0.5 text-sm">
                    <span className="font-semibold text-forest-700">{rupee.format(e.amount)}</span>
                    {e.paymentRef && <span className="text-slate-500"> · Txn ID {e.paymentRef}</span>}
                    {e.createdAt && <span className="text-slate-400"> · {dateFormat.format(e.createdAt.toDate())}</span>}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => showProof(e.id)}
                    className="rounded-full border border-forest-200 px-4 py-2 text-sm font-semibold text-forest-700 transition hover:bg-forest-50"
                  >
                    {e.id in proofs ? "Hide screenshot" : "View screenshot"}
                  </button>
                  <button
                    type="button"
                    onClick={() => review(e, "approved")}
                    disabled={busy === e.id}
                    className="rounded-full bg-forest-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-forest-600 disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => review(e, "rejected")}
                    disabled={busy === e.id}
                    className="rounded-full px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </div>
              {e.id in proofs &&
                (proofs[e.id] ? (
                  <a href={proofs[e.id]!} target="_blank" rel="noopener noreferrer" className="mt-3 block w-fit">
                    {/* eslint-disable-next-line @next/next/no-img-element -- data URL screenshot */}
                    <img src={proofs[e.id]!} alt={`Payment screenshot from ${e.studentName}`} className="max-h-96 rounded-xl border border-forest-100" />
                  </a>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">No screenshot was uploaded for this enrollment.</p>
                ))}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function AdminContent({ me }: { me: AppUser }) {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [error, setError] = useState("");
  const { courses, error: coursesError } = useCourses();
  const enrollments = useAllEnrollments();
  const [sessions, setSessions] = useState<LiveSession[] | null>(null);

  useEffect(() => {
    getDocs(collection(db, "users"))
      .then((snap) => {
        const rows = snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as UserRow);
        rows.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
        setUsers(rows);
      })
      .catch(() => setError("Couldn't load users. Make sure the Firestore rules are deployed."));

    // Every course's sessions; filtered here so no collection-group index is needed.
    return onSnapshot(
      collectionGroup(db, "sessions"),
      (snap) => setSessions(sortSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LiveSession).filter((s) => s.date >= localDate()))),
      () => setSessions([]),
    );
  }, []);

  const setRole = async (uid: string, role: Role) => {
    const before = users?.find((u) => u.uid === uid)?.role;
    await updateDoc(doc(db, "users", uid), { role });
    // A former mentor's public card comes off the Mentors page.
    if (before === "mentor" && role !== "mentor") await deleteMentorProfile(uid).catch(() => {});
    setUsers((list) => list?.map((u) => (u.uid === uid ? { ...u, role } : u)) ?? list);
  };

  // Approve: the applicant becomes a mentor. Reject: the application is withdrawn and the account stays a student.
  const decideApplication = async (uid: string, approve: boolean) => {
    await updateDoc(doc(db, "users", uid), approve ? { role: "mentor" } : { requestedRole: deleteField() });
    setUsers(
      (list) =>
        list?.map((u) => (u.uid !== uid ? u : approve ? { ...u, role: "mentor" as Role } : { ...u, requestedRole: undefined })) ?? list,
    );
  };

  const handleDeleteUser = async (uid: string) => {
    await deleteDoc(doc(db, "users", uid));
    await deleteMentorProfile(uid).catch(() => {});
    setUsers((list) => list?.filter((u) => u.uid !== uid) ?? null);
  };

  const count = (role: Role) => users?.filter((u) => u.role === role).length ?? "—";
  const enrolledIn = (courseId: string) => enrollments?.filter((e) => e.courseId === courseId).length ?? 0;
  const stats = [
    { label: "Students", value: count("student"), icon: GraduationIcon },
    { label: "Mentors", value: count("mentor"), icon: UsersIcon },
    { label: "Courses", value: courses?.length ?? "—", icon: BookIcon },
    { label: "Payments to verify", value: enrollments?.filter((e) => e.status === "pending").length ?? "—", icon: ClipboardIcon },
  ];
  const applications = users?.filter((u) => u.role === "student" && u.requestedRole === "mentor").length ?? 0;
  const pendingPayments = enrollments?.filter((e) => e.status === "pending").length ?? 0;

  return (
    <>
      <WelcomeBanner id="overview" title={<>Welcome, {greetingName(me)}!</>}>
        <p className="mt-3 text-sm leading-relaxed text-forest-100 sm:text-base">
          Overview of every student, mentor, course and live session on the platform.
          {applications > 0 && (
            <>
              {" "}
              <strong className="text-spark-400">
                {applications} mentor application{applications === 1 ? "" : "s"}
              </strong>{" "}
              waiting for review.
            </>
          )}
          {pendingPayments > 0 && (
            <>
              {" "}
              <a href="#payments" className="font-bold text-spark-400 underline-offset-2 hover:underline">
                {pendingPayments} payment{pendingPayments === 1 ? "" : "s"} to verify.
              </a>
            </>
          )}
        </p>
      </WelcomeBanner>

      <StatTiles stats={stats} />

      <PaymentsCard me={me} enrollments={enrollments} />

      <UsersCard
        me={me}
        users={users}
        error={error}
        onRoleChange={setRole}
        onApplication={decideApplication}
        onDeleteUser={handleDeleteUser}
      />

      <MentorEarningsCard users={users} courses={courses} enrollments={enrollments} />

      <Card id="courses">
        <CardTitle title="Courses" />
        <p className="mt-1 text-sm text-slate-500">Posted and managed by mentors.</p>
        {coursesError && <p className="mt-4 text-sm font-medium text-red-600">{coursesError}</p>}
        {courses === null ? (
          <p className="mt-6 text-sm text-slate-500">Loading courses…</p>
        ) : courses.length === 0 ? (
          <EmptyState icon={BookIcon} title="No courses posted yet" />
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="pb-3 font-semibold">Course</th>
                  <th className="pb-3 font-semibold">Mentor</th>
                  <th className="pb-3 font-semibold">Level</th>
                  <th className="pb-3 font-semibold">Students</th>
                  <th className="pb-3 font-semibold">Posted</th>
                  <th className="pb-3 text-right font-semibold">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest-100">
                {courses.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 pr-4 font-semibold text-forest-950">
                      <Link href={coursePath(c.id)} className="hover:text-forest-600">
                        {c.title}
                      </Link>
                      <span className="block text-xs font-normal text-slate-500">{c.category}</span>
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{c.mentorName}</td>
                    <td className="py-3 pr-4 text-slate-600">{c.level}</td>
                    <td className="py-3 pr-4 text-slate-600">{enrollments ? enrolledIn(c.id) : "—"}</td>
                    <td className="py-3 pr-4 text-slate-500">{c.createdAt ? dateFormat.format(c.createdAt.toDate()) : "—"}</td>
                    <td className="py-3 text-right font-semibold text-forest-700">{c.price ? rupee.format(c.price) : "Free"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card id="enrollments">
        <CardTitle title="Enrollments" />
        {enrollments === null ? (
          <p className="mt-6 text-sm text-slate-500">Loading enrollments…</p>
        ) : enrollments.length === 0 ? (
          <EmptyState icon={ClipboardIcon} title="No enrollments yet" />
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="pb-3 font-semibold">Student</th>
                  <th className="pb-3 font-semibold">Course</th>
                  <th className="pb-3 font-semibold">Payment</th>
                  <th className="pb-3 font-semibold">Enrolled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest-100">
                {enrollments.map((e) => (
                  <tr key={e.id}>
                    <td className="py-3 pr-4">
                      <span className="font-semibold text-forest-950">{e.studentName}</span>
                      <span className="block text-xs text-slate-500">
                        {e.studentMemberId && <span className="font-mono font-semibold text-forest-700">{e.studentMemberId} · </span>}
                        {e.studentEmail}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{e.courseTitle}</td>
                    <td className="py-3 pr-4">
                      <span className="block text-slate-600">{e.amount ? rupee.format(e.amount) : "Free"}</span>
                      <span
                        className={`text-xs font-semibold ${
                          e.status === "approved" ? "text-forest-700" : e.status === "rejected" ? "text-red-600" : "text-amber-600"
                        }`}
                      >
                        {e.status === "approved" ? "Verified" : e.status === "rejected" ? "Rejected" : "Pending"}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500">{e.createdAt ? dateFormat.format(e.createdAt.toDate()) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card id="sessions">
        <CardTitle title="Upcoming live sessions" />
        {sessions === null ? (
          <p className="mt-6 text-sm text-slate-500">Loading sessions…</p>
        ) : sessions.length === 0 ? (
          <EmptyState icon={CalendarIcon} title="No sessions scheduled" />
        ) : (
          <ul className="mt-5 divide-y divide-forest-100">
            {sessions.map((s) => (
              <li key={`${s.courseId}-${s.id}`} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-forest-950">{s.topic}</p>
                  <p className="text-sm text-slate-500">
                    {s.courseTitle} · {s.mentorName}
                  </p>
                </div>
                <div className="text-sm sm:text-right">
                  <p className="font-medium text-forest-700">{sessionWhen(s)}</p>
                  <a href={s.meetLink} target="_blank" rel="noopener noreferrer" className="text-xs text-forest-600 hover:underline">
                    {s.meetLink}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
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

