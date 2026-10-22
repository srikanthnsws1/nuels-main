"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, BookIcon, CalendarIcon, CartIcon, CheckIcon, ClipboardIcon, ClockIcon, GraduationIcon, GridIcon, SparkIcon } from "../icons";
import DashboardShell, { type Section } from "./DashboardShell";
import { Card, CardTitle, EmptyState, WelcomeBanner, rupee } from "./ui";
import { courses } from "@/data/site";
import { greetingName, type AppUser } from "@/lib/auth";
import { awaitingConfirmation, coursesFor, useMyOrders } from "@/lib/orders";

const sections: Section[] = [
  { id: "overview", label: "Overview", icon: GridIcon },
  { id: "my-courses", label: "My Courses", icon: BookIcon },
  { id: "schedule", label: "Live Sessions", icon: CalendarIcon },
  { id: "assignments", label: "Assignments", icon: ClipboardIcon },
  { id: "certificates", label: "Certificates", icon: GraduationIcon },
];

const sidebarCard = (
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
);

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function StudentContent({ user }: { user: AppUser }) {
  const orders = useMyOrders(user.uid);
  const enrolled = coursesFor(user.enrolledCourses);
  const awaiting = (orders ?? []).filter(awaitingConfirmation);
  const explore = courses.filter((c) => !user.enrolledCourses.includes(c.slug)).slice(0, 3);

  return (
    <>
      <WelcomeBanner id="overview" title={<>Welcome, {greetingName(user)}! 👋</>}>
        <p className="mt-3 text-sm leading-relaxed text-forest-100 sm:text-base">
          {enrolled.length
            ? `You're enrolled in ${plural(enrolled.length, "course", "courses")}. Your live sessions and mentor feedback show up here too.`
            : "Your courses, live sessions and mentor feedback will show up here once you enroll."}
        </p>
        <Link
          href={enrolled.length ? "#my-courses" : "/courses"}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-spark-500 px-6 py-3 text-sm font-bold text-forest-900 shadow-lg shadow-spark-500/30 transition hover:bg-spark-400"
        >
          {enrolled.length ? "Go to my courses" : "Browse courses"} <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </WelcomeBanner>

      {user.cart.length > 0 && (
        <Link
          href="/cart"
          className="flex flex-wrap items-center gap-4 rounded-3xl border border-spark-500/60 bg-spark-500/15 p-4 transition hover:bg-spark-500/25 sm:p-5"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-forest-700 text-spark-400">
            <CartIcon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-forest-950">{plural(user.cart.length, "course is", "courses are")} waiting in your cart</span>
            <span className="block text-sm text-slate-600">Complete the payment to unlock {user.cart.length === 1 ? "it" : "them"}.</span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-forest-700 px-5 py-2.5 text-sm font-semibold text-white">
            Checkout <ArrowRightIcon className="h-4 w-4" />
          </span>
        </Link>
      )}

      {awaiting.length > 0 && (
        <Link
          href="/cart#orders"
          className="flex flex-wrap items-center gap-4 rounded-3xl border border-amber-200 bg-amber-50 p-4 transition hover:bg-amber-100/70 sm:p-5"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-forest-950">
            <ClockIcon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-forest-950">Payment awaiting confirmation</span>
            <span className="block text-sm text-slate-600">
              {coursesFor(awaiting.flatMap((o) => o.courses))
                .map((c) => c.title)
                .join(", ")}{" "}
              will unlock as soon as our team confirms your payment.
            </span>
          </span>
          <span className="text-sm font-semibold text-forest-700">View order →</span>
        </Link>
      )}

      <Card id="my-courses">
        <CardTitle title="My courses" />
        {enrolled.length === 0 ? (
          <EmptyState icon={BookIcon} title="You haven't enrolled in a course yet">
            Pick a course and your progress will be tracked here.
          </EmptyState>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enrolled.map((c) => (
              <Link
                key={c.slug}
                href={`/courses/${c.slug}`}
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
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-spark-500 px-2.5 py-1 text-xs font-bold text-forest-900">
                    <CheckIcon className="h-3.5 w-3.5" /> Enrolled
                  </span>
                </div>
                <div className="p-2 pt-3">
                  <p className="text-xs font-medium text-forest-600">
                    {c.category} · {c.level}
                  </p>
                  <p className="mt-1 font-semibold leading-snug text-forest-950">{c.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {c.lessons} lessons · with {c.mentor}
                  </p>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-forest-700">
                    Open course <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Card id="schedule">
          <CardTitle title="Upcoming live sessions" />
          <EmptyState icon={CalendarIcon} title="No sessions scheduled" />
        </Card>
        <Card id="assignments">
          <CardTitle title="Assignments" />
          <EmptyState icon={ClipboardIcon} title="No assignments yet" />
        </Card>
        <Card id="certificates" className="lg:col-span-2 xl:col-span-1">
          <CardTitle title="Certificates" />
          <EmptyState icon={GraduationIcon} title="No certificates yet">
            Finish a course to earn its certificate.
          </EmptyState>
        </Card>
      </div>

      {explore.length > 0 && (
        <Card>
          <CardTitle
            title="Explore courses"
            action={
              <Link href="/courses" className="-my-2 py-2 text-sm font-semibold text-forest-600 hover:text-forest-500">
                Browse all
              </Link>
            }
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {explore.map((c) => (
              <Link
                key={c.slug}
                href={`/courses/${c.slug}`}
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
                  {user.cart.includes(c.slug) && (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-forest-700">
                      <CartIcon className="h-3.5 w-3.5" /> In cart
                    </span>
                  )}
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
      )}
    </>
  );
}

export default function Dashboard() {
  return (
    <DashboardShell role="student" sections={sections} sidebarCard={sidebarCard}>
      {(user) => <StudentContent user={user} />}
    </DashboardShell>
  );
}
