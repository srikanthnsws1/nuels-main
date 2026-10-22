"use client";

import { collection, onSnapshot, query, where, type Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { BookIcon, BriefcaseIcon, CartIcon, GraduationIcon, GridIcon, PlayIcon, SearchIcon, UsersIcon } from "../icons";
import { CoursesCard } from "./AdminCourses";
import { CourseContentCard, LearnersCard } from "./AdminLearning";
import { OrdersCard } from "./AdminPayments";
import { EmployeesCard } from "./AdminStaff";
import DashboardShell, { type Section } from "./DashboardShell";
import { Avatar, Card, CardTitle, EmptyState, WelcomeBanner } from "./ui";
import { displayRole, greetingName, useAuth, type AppUser } from "@/lib/auth";
import { useCatalog } from "@/lib/catalog";
import { coursesFor } from "@/lib/orders";
import { db } from "@/lib/firebase";
import { can, permissionList } from "@/lib/staff";

type Student = {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  memberId?: string;
  city?: string;
  enrolledCourses?: string[];
  cart?: string[];
  createdAt?: Timestamp;
};

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

function useStudents(enabled: boolean) {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!enabled) return;
    return onSnapshot(
      query(collection(db, "users"), where("role", "==", "student")),
      (snap) => {
        const rows = snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as Student);
        rows.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
        setStudents(rows);
      },
      () => setError("Couldn't load students."),
    );
  }, [enabled]);
  return { students, error };
}

function StudentsCard({ students, error }: { students: Student[] | null; error: string }) {
  useCatalog(true); // re-render with live course names
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const visible = (students ?? []).filter((s) => !term || [s.name, s.email, s.phone, s.memberId].some((v) => v?.toLowerCase().includes(term)));

  return (
    <Card id="students">
      <CardTitle title="Students" action={students && <span className="text-sm text-slate-500">{students.length} total</span>} />
      <div className="mt-5 flex items-center gap-3 rounded-full border border-forest-100 bg-white px-4 py-2 focus-within:border-forest-300 sm:max-w-md">
        <SearchIcon className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, phone or ID"
          aria-label="Search students"
          className="w-full min-w-0 bg-transparent py-1 text-sm outline-none placeholder:text-slate-400"
        />
      </div>
      {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
      {students === null && !error ? (
        <p className="mt-6 text-sm text-slate-500">Loading students…</p>
      ) : visible.length === 0 ? (
        <EmptyState icon={UsersIcon} title={students?.length ? "No students match" : "No students yet"} />
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="pb-3 font-semibold">Student</th>
                <th className="pb-3 font-semibold">Contact</th>
                <th className="pb-3 font-semibold">Enrolled in</th>
                <th className="pb-3 font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-forest-100">
              {visible.map((s) => (
                <tr key={s.uid} className="align-top">
                  <td className="py-3 pr-4">
                    <span className="font-semibold text-forest-950">{s.name}</span>
                    {s.memberId && <span className="block font-mono text-xs text-forest-700">{s.memberId}</span>}
                  </td>
                  <td className="py-3 pr-4 text-slate-600">
                    <span className="block">{s.email}</span>
                    {s.phone && <span className="block text-xs">{s.phone}</span>}
                  </td>
                  <td className="py-3 pr-4 text-slate-600">
                    {coursesFor(s.enrolledCourses ?? [])
                      .map((c) => c.title)
                      .join(", ") || <span className="text-slate-400">—</span>}
                    {!!s.cart?.length && <span className="block text-xs text-amber-700">{s.cart.length} in cart</span>}
                  </td>
                  <td className="py-3 text-slate-500">{s.createdAt ? dateFormat.format(s.createdAt.toDate()) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function ProfileCard({ user }: { user: AppUser }) {
  const allowed = permissionList.filter((p) => user.permissions.includes(p.id));
  const rows = [
    ["Employee number", user.employeeNumber],
    ["Staff ID", user.memberId],
    ["Email", user.email],
    ["Contact number", user.phone],
  ].filter(([, v]) => v);

  return (
    <Card id="profile">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <Avatar name={user.name} photo={user.photo} className="h-24 w-24 text-2xl" />
        <div className="min-w-0 flex-1">
          <p className="text-xl font-bold text-forest-950">{user.name}</p>
          <p className="font-medium text-forest-700">{displayRole(user)}</p>
          <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-slate-500">{k}</dt>
                <dd className="break-all font-medium text-forest-950">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="sm:w-64">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Your access</p>
          {allowed.length ? (
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {allowed.map((p) => (
                <li key={p.id}>✓ {p.label}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No sections yet. Ask your administrator for access.</p>
          )}
        </div>
      </div>
    </Card>
  );
}

function StaffContent({ user }: { user: AppUser }) {
  const showStudents = can(user, "students.view");
  const needStudents = showStudents || can(user, "learners.manage");
  const { students, error } = useStudents(needStudents);

  return (
    <>
      <WelcomeBanner id="overview" title={<>Welcome, {greetingName(user)}!</>}>
        <p className="mt-3 text-sm leading-relaxed text-forest-100 sm:text-base">
          {displayRole(user)}
          {user.employeeNumber && ` · ${user.employeeNumber}`}. Everything you have access to is on this page.
        </p>
      </WelcomeBanner>

      <ProfileCard user={user} />

      {can(user, "payments.view") || can(user, "payments.approve") ? <OrdersCard me={user} canApprove={can(user, "payments.approve")} /> : null}
      {showStudents && <StudentsCard students={students} error={error} />}
      {can(user, "learners.manage") && <LearnersCard users={students} />}
      {can(user, "courses.manage") && <CoursesCard />}
      {can(user, "videos.manage") && <CourseContentCard />}
      {can(user, "staff.view") && <EmployeesCard />}
    </>
  );
}

/** Dashboard for company employees; its sections follow the permissions an admin granted. */
export default function StaffDashboard() {
  const { user } = useAuth();
  const has = (p: Parameters<typeof can>[1]) => !!user && can(user, p);
  const sections: Section[] = [
    { id: "overview", label: "Overview", icon: GridIcon },
    { id: "profile", label: "My Profile", icon: UsersIcon },
    ...(has("payments.view") || has("payments.approve") ? [{ id: "orders", label: "Payments", icon: CartIcon }] : []),
    ...(has("students.view") ? [{ id: "students", label: "Students", icon: GraduationIcon }] : []),
    ...(has("learners.manage") ? [{ id: "learners", label: "Learners", icon: GraduationIcon }] : []),
    ...(has("courses.manage") ? [{ id: "courses", label: "Courses", icon: BookIcon }] : []),
    ...(has("videos.manage") ? [{ id: "course-content", label: "Course Videos", icon: PlayIcon }] : []),
    ...(has("staff.view") ? [{ id: "employees", label: "Employees", icon: BriefcaseIcon }] : []),
  ];

  return (
    <DashboardShell role="employee" sections={sections}>
      {(u) => <StaffContent user={u} />}
    </DashboardShell>
  );
}
