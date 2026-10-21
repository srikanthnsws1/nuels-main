"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, BookIcon, CalendarIcon, ClipboardIcon, GraduationIcon, GridIcon, SparkIcon } from "../icons";
import DashboardShell, { type Section } from "./DashboardShell";
import { Card, CardTitle, EmptyState, WelcomeBanner, rupee } from "./ui";
import { courses } from "@/data/site";

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

export default function Dashboard() {
  return (
    <DashboardShell role="student" sections={sections} sidebarCard={sidebarCard}>
      {(user) => (
        <>
          <WelcomeBanner id="overview" title={<>Welcome, {user.name.split(" ")[0] || "there"}! 👋</>}>
            <p className="mt-3 text-sm leading-relaxed text-forest-100 sm:text-base">
              Your courses, live sessions and mentor feedback will show up here once you enroll.
            </p>
            <Link
              href="/courses"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-spark-500 px-6 py-3 text-sm font-bold text-forest-900 shadow-lg shadow-spark-500/30 transition hover:bg-spark-400"
            >
              Browse courses <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </WelcomeBanner>

          <Card id="my-courses">
            <CardTitle title="My courses" />
            <EmptyState icon={BookIcon} title="You haven't enrolled in a course yet">
              Pick a course and your progress will be tracked here.
            </EmptyState>
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
              {courses.slice(0, 3).map((c) => (
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
        </>
      )}
    </DashboardShell>
  );
}
