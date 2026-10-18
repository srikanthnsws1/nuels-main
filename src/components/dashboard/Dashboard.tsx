"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "../Logo";
import {
  ArrowRightIcon,
  BellIcon,
  BookIcon,
  CalendarIcon,
  CheckIcon,
  ClipboardIcon,
  ClockIcon,
  GraduationIcon,
  GridIcon,
  LogoutIcon,
  SearchIcon,
  SparkIcon,
} from "../icons";
import Reveal from "../motion/Reveal";
import { assignments, enrollments, liveSessions, recommended, weeklyHours } from "@/data/dashboard";
import { signOut, useStudent } from "@/lib/session";

const sections = [
  { id: "overview", label: "Overview", icon: GridIcon },
  { id: "my-courses", label: "My Courses", icon: BookIcon },
  { id: "schedule", label: "Live Sessions", icon: CalendarIcon },
  { id: "assignments", label: "Assignments", icon: ClipboardIcon },
  { id: "certificates", label: "Certificates", icon: GraduationIcon },
];

const rupee = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Card({ id, className = "", children }: { id?: string; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={`min-w-0 scroll-mt-28 rounded-3xl border border-forest-100 bg-white p-5 sm:p-6 lg:scroll-mt-8 ${className}`}>
      {children}
    </section>
  );
}

function CardTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-lg font-bold tracking-tight text-forest-950">{title}</h2>
      {action}
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-forest-50" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={`h-full rounded-full ${value === 100 ? "bg-spark-500" : "bg-gradient-to-r from-forest-500 to-forest-700"}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function WeeklyChart() {
  const max = Math.max(...weeklyHours.map((d) => d.hours));
  const total = weeklyHours.reduce((s, d) => s + d.hours, 0);
  const scale = Math.ceil(max);

  return (
    <div>
      <p className="text-sm text-slate-500">
        <span className="text-2xl font-bold text-forest-950">{total.toFixed(1)} hrs</span> learned this week
      </p>

      <div className="relative mt-6 h-44" aria-hidden>
        {/* recessive gridlines */}
        {[1, 0.5, 0].map((t) => (
          <div key={t} className="absolute inset-x-0 border-t border-dashed border-forest-100" style={{ bottom: `${t * 100}%` }}>
            <span className="absolute -top-2 right-0 bg-white pl-1 text-[10px] text-slate-400">{(scale * t).toFixed(t === 0.5 ? 1 : 0)}h</span>
          </div>
        ))}
        <div className="absolute inset-0 right-8 flex items-end justify-around gap-2">
          {weeklyHours.map((d) => {
            const isMax = d.hours === max;
            return (
              <div key={d.day} className="group relative flex h-full w-full max-w-10 flex-col justify-end">
                {isMax && (
                  <span className="mb-1 text-center text-xs font-semibold text-forest-900 group-hover:invisible">{d.hours}h</span>
                )}
                <div
                  className="w-full rounded-t-[4px] bg-forest-600 transition group-hover:bg-forest-700"
                  style={{ height: `${(d.hours / scale) * 100}%` }}
                />
                {/* tooltip */}
                <span className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-forest-950 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                  {d.day} · {d.hours} hrs
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mr-8 mt-2 flex justify-around gap-2 text-xs text-slate-500" aria-hidden>
        {weeklyHours.map((d) => (
          <span key={d.day} className="w-full max-w-10 text-center">
            {d.day}
          </span>
        ))}
      </div>

      <table className="sr-only">
        <caption>Hours learned per day this week</caption>
        <tbody>
          {weeklyHours.map((d) => (
            <tr key={d.day}>
              <th scope="row">{d.day}</th>
              <td>{d.hours} hours</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { student, ready } = useStudent();
  const [active, setActive] = useState("overview");

  // Not logged in → send to the login page.
  useEffect(() => {
    if (ready && !student) router.replace("/login");
  }, [ready, student, router]);

  if (!student) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-forest-50/60">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-forest-100 border-t-forest-700" aria-label="Loading" />
      </div>
    );
  }

  const firstName = student.name.split(" ")[0] || "there";
  const inProgress = enrollments.filter((e) => e.progress < 100);
  const completed = enrollments.filter((e) => e.progress === 100);
  const hoursTotal = weeklyHours.reduce((s, d) => s + d.hours, 0);

  const stats = [
    { label: "Enrolled courses", value: enrollments.length, icon: BookIcon },
    { label: "Hours this week", value: hoursTotal.toFixed(1), icon: ClockIcon },
    { label: "Certificates earned", value: completed.length, icon: GraduationIcon },
    { label: "Day learning streak", value: 12, icon: SparkIcon },
  ];

  const logout = () => {
    signOut();
    router.push("/login");
  };

  const navLink = (s: (typeof sections)[number], compact = false) => {
    const Icon = s.icon;
    const on = active === s.id;
    return (
      <a
        key={s.id}
        href={`#${s.id}`}
        onClick={() => setActive(s.id)}
        aria-current={on ? "true" : undefined}
        className={
          compact
            ? `flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                on ? "bg-forest-700 text-white shadow-lg shadow-forest-700/20" : "border border-forest-100 bg-white text-slate-600"
              }`
            : `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                on ? "bg-spark-500 font-semibold text-forest-900" : "text-forest-100 hover:bg-white/10 hover:text-white"
              }`
        }
      >
        <Icon className="h-[18px] w-[18px]" />
        {s.label}
      </a>
    );
  };

  return (
    <div className="min-h-dvh bg-forest-50/60">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col overflow-hidden bg-forest-800 p-6 lg:flex">
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,var(--color-spark-500),transparent)] opacity-10" />
        <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,var(--color-forest-600),transparent)] opacity-40" />
        <div className="relative">
          <Logo light />
        </div>
        <nav className="relative mt-10 flex flex-col gap-1" aria-label="Dashboard">
          {sections.map((s) => navLink(s))}
        </nav>

        <div className="relative mt-auto space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <SparkIcon className="h-6 w-6 text-spark-400" />
            <p className="mt-3 font-semibold text-white">Explore more courses</p>
            <p className="mt-1 text-xs leading-relaxed text-forest-100">New mentor-led courses are added every month.</p>
            <Link
              href="/courses"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-spark-500 px-4 py-2 text-xs font-bold text-forest-900 transition hover:bg-spark-400"
            >
              Browse courses <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-forest-100 transition hover:bg-white/10 hover:text-white"
          >
            <LogoutIcon className="h-[18px] w-[18px]" />
            Log out
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        {/* top bar */}
        <header className="sticky top-0 z-30 border-b border-forest-100 bg-white/95 md:bg-white/85 md:backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:h-20 sm:px-6 xl:px-10">
            <div className="lg:hidden">
              <Logo />
            </div>
            <div className="ml-auto hidden max-w-md flex-1 items-center gap-3 rounded-full border border-forest-100 bg-white px-4 py-2.5 transition focus-within:border-forest-300 md:flex lg:ml-0">
              <SearchIcon className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="search"
                placeholder="Search your courses, lessons…"
                aria-label="Search your courses"
                className="w-full min-w-0 bg-transparent py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                aria-label="Notifications"
                className="relative flex h-10 w-10 items-center justify-center rounded-full bg-forest-50 text-forest-700 transition hover:bg-forest-100"
              >
                <BellIcon className="h-5 w-5" />
                <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-spark-500 ring-2 ring-white" />
              </button>
              <div className="flex items-center gap-3 rounded-full bg-forest-50 py-1 pl-1 pr-1 sm:pr-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-700 text-sm font-bold text-spark-400">
                  {initials(student.name) || "S"}
                </span>
                <div className="hidden leading-tight sm:block">
                  <p className="text-sm font-semibold text-forest-950">{student.name}</p>
                  <p className="text-xs text-slate-500">Student</p>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                aria-label="Log out"
                className="flex h-10 w-10 items-center justify-center rounded-full text-forest-700 transition hover:bg-forest-50 lg:hidden"
              >
                <LogoutIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          {/* mobile / tablet section nav */}
          <nav className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3 sm:px-6 lg:hidden" aria-label="Dashboard">
            {sections.map((s) => navLink(s, true))}
          </nav>
        </header>

        <main className="space-y-6 px-4 py-6 sm:px-6 sm:py-8 xl:px-10">
          {/* welcome banner */}
          <Reveal immediate>
            <div id="overview" className="relative scroll-mt-40 overflow-hidden rounded-3xl bg-forest-700 p-6 sm:p-8 lg:scroll-mt-28 xl:p-10">
              {[100, 78, 56].map((size, i) => (
                <div
                  key={size}
                  className="pointer-events-none absolute right-0 top-1/2 aspect-square -translate-y-1/2 translate-x-1/3 rounded-full"
                  style={{ width: `${size * 0.6}%`, background: `rgba(255,255,255,${0.04 + i * 0.015})` }}
                />
              ))}
              <SparkIcon className="absolute right-[10%] top-8 hidden h-10 w-10 animate-float text-spark-500 sm:block" />
              <div className="relative max-w-xl">
                <p className="text-sm font-semibold text-spark-400">{greeting()},</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl xl:text-4xl">
                  Welcome back, {firstName}! 👋
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-forest-100 sm:text-base">
                  You&apos;re {inProgress[0]?.progress ?? 0}% through <strong className="text-white">{inProgress[0]?.course.title}</strong>.
                  Keep the momentum going, your next live session is {liveSessions[0].day.toLowerCase()} at {liveSessions[0].time}.
                </p>
                {inProgress[0] && (
                  <a
                    href="#my-courses"
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-spark-500 px-6 py-3 text-sm font-bold text-forest-900 shadow-lg shadow-spark-500/30 transition hover:bg-spark-400"
                  >
                    Resume learning <ArrowRightIcon className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </Reveal>

          {/* stat tiles */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {stats.map(({ label, value, icon: Icon }, i) => (
              <Reveal immediate key={label} delay={i * 80} className="h-full">
                <div className="flex h-full flex-col gap-4 rounded-3xl border border-forest-100 bg-white p-4 sm:flex-row sm:items-center sm:p-5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-forest-700 text-spark-400">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-2xl font-bold text-forest-950">{value}</p>
                    <p className="text-xs text-slate-500 sm:text-sm">{label}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            {/* continue learning */}
            <Card id="my-courses" className="xl:col-span-2">
              <CardTitle
                title="Continue learning"
                action={
                  <Link href="/courses" className="-my-2 py-2 text-sm font-semibold text-forest-600 hover:text-forest-500">
                    View all
                  </Link>
                }
              />
              <div className="mt-5 space-y-4">
                {enrollments.map((e) => (
                  <article
                    key={e.course.title}
                    className="flex flex-col gap-4 rounded-2xl border border-forest-100 p-3 transition hover:shadow-lg hover:shadow-forest-900/5 sm:flex-row sm:items-center"
                  >
                    <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl sm:w-40">
                      <Image src={e.course.image} alt={e.course.title} fill sizes="(min-width: 640px) 160px, 100vw" className="object-cover" />
                      <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-semibold text-forest-700">
                        {e.course.category}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 px-1 sm:px-0">
                      <h3 className="font-semibold leading-snug text-forest-950">{e.course.title}</h3>
                      <p className="mt-0.5 text-sm text-slate-500">
                        by <span className="font-medium text-forest-600">{e.course.mentor}</span>
                      </p>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1">
                          <ProgressBar value={e.progress} />
                        </div>
                        <span className="text-sm font-semibold text-forest-900">{e.progress}%</span>
                      </div>
                      <p className="mt-2 truncate text-xs text-slate-500">
                        {e.lessonsDone}/{e.course.lessons} lessons ·{" "}
                        {e.progress === 100 ? "Completed 🎉" : <>Next: {e.nextLesson}</>}
                      </p>
                    </div>
                    <a
                      href="#"
                      className={`shrink-0 rounded-full px-5 py-2.5 text-center text-sm font-semibold transition ${
                        e.progress === 100
                          ? "border border-forest-200 text-forest-700 hover:bg-forest-50"
                          : "bg-forest-700 text-white hover:bg-forest-600"
                      }`}
                    >
                      {e.progress === 100 ? "Review" : "Continue"}
                    </a>
                  </article>
                ))}
              </div>
            </Card>

            {/* weekly activity */}
            <Card>
              <CardTitle title="Weekly activity" />
              <div className="mt-4">
                <WeeklyChart />
              </div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {/* live sessions */}
            <Card id="schedule">
              <CardTitle title="Upcoming live sessions" />
              <ul className="mt-5 space-y-3">
                {liveSessions.map((s, i) => (
                  <li key={s.title} className={`flex items-center gap-3 rounded-2xl p-3 ${i === 0 ? "bg-forest-50" : ""}`}>
                    <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-white py-1.5 text-center shadow-sm">
                      <span className="text-[11px] font-semibold uppercase text-forest-600">{s.day}</span>
                      <span className="text-xs font-bold text-forest-950">{s.time}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-forest-950">{s.title}</p>
                      <p className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Image src={s.image} alt="" width={18} height={18} className="h-[18px] w-[18px] rounded-full object-cover" />
                        {s.mentor}
                      </p>
                    </div>
                    {i === 0 && (
                      <a href="#" className="shrink-0 rounded-full bg-spark-500 px-4 py-2.5 text-xs font-bold text-forest-900 hover:bg-spark-400">
                        Join
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </Card>

            {/* assignments */}
            <Card id="assignments">
              <CardTitle title="Assignments" />
              <ul className="mt-5 space-y-3">
                {assignments.map((a) => {
                  const done = a.status === "Reviewed";
                  return (
                    <li key={a.title} className="flex items-start gap-3 rounded-2xl border border-forest-100 p-3">
                      <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          done ? "bg-forest-700 text-spark-400" : "bg-forest-50 text-forest-700"
                        }`}
                      >
                        {done ? <CheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-forest-950">{a.title}</p>
                        <p className="truncate text-xs text-slate-500">{a.course}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                          <span className="rounded-full bg-forest-50 px-2.5 py-0.5 text-forest-700">{a.status}</span>
                          <span className="text-slate-400">{a.due}</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>

            {/* certificates */}
            <Card id="certificates" className="lg:col-span-2 xl:col-span-1">
              <CardTitle title="Certificates" />
              <div className="mt-5 space-y-3">
                {completed.map((e) => (
                  <div key={e.course.title} className="relative overflow-hidden rounded-2xl bg-forest-800 p-5">
                    <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(closest-side,var(--color-spark-500),transparent)] opacity-20" />
                    <GraduationIcon className="relative h-7 w-7 text-spark-400" />
                    <p className="relative mt-3 text-xs font-semibold uppercase tracking-wider text-forest-200">Certificate of completion</p>
                    <p className="relative mt-1 font-semibold text-white">{e.course.title}</p>
                    <p className="relative text-xs text-forest-200">Mentor: {e.course.mentor}</p>
                    <a
                      href="#"
                      className="relative mt-4 inline-flex rounded-full bg-spark-500 px-4 py-2 text-xs font-bold text-forest-900 hover:bg-spark-400"
                    >
                      Download
                    </a>
                  </div>
                ))}
                {inProgress.map((e) => (
                  <div key={e.course.title} className="rounded-2xl border border-dashed border-forest-200 p-4">
                    <p className="text-sm font-semibold text-forest-950">{e.course.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">Unlocks at 100% · {100 - e.progress}% to go</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* recommendations */}
          <Card>
            <CardTitle
              title="Recommended for you"
              action={
                <Link href="/courses" className="-my-2 py-2 text-sm font-semibold text-forest-600 hover:text-forest-500">
                  Browse all
                </Link>
              }
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recommended.map((c) => (
                <Link
                  key={c.title}
                  href="/courses"
                  className="group overflow-hidden rounded-2xl border border-forest-100 p-2 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-forest-900/10"
                >
                  <div className="relative aspect-video overflow-hidden rounded-xl">
                    <Image
                      src={c.image}
                      alt={c.title}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-2 pt-3">
                    <p className="text-xs font-medium text-forest-600">{c.level}</p>
                    <p className="mt-1 font-semibold leading-snug text-forest-950">{c.title}</p>
                    <p className="mt-1 text-sm font-bold text-forest-700">{rupee.format(c.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
