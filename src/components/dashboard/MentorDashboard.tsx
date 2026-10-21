"use client";

import Image from "next/image";
import Link from "next/link";
import { BookIcon, CalendarIcon, ClipboardIcon, ClockIcon, GridIcon, PlayIcon, UsersIcon } from "../icons";
import DashboardShell, { type Section } from "./DashboardShell";
import { Card, CardTitle, EmptyState, StatTiles, WelcomeBanner } from "./ui";
import { courses } from "@/data/site";

const sections: Section[] = [
  { id: "overview", label: "Overview", icon: GridIcon },
  { id: "my-courses", label: "My Courses", icon: BookIcon },
  { id: "students", label: "Students", icon: UsersIcon },
  { id: "sessions", label: "Live Sessions", icon: CalendarIcon },
  { id: "reviews", label: "Reviews", icon: ClipboardIcon },
];

export default function MentorDashboard() {
  return (
    <DashboardShell role="mentor" sections={sections}>
      {(user) => {
        // Courses are linked to a mentor by the name shown on the course page.
        const myCourses = courses.filter((c) => c.mentor === user.name);
        const stats = [
          { label: "Courses you teach", value: myCourses.length, icon: BookIcon },
          { label: "Lessons", value: myCourses.reduce((s, c) => s + c.lessons, 0), icon: PlayIcon },
          { label: "Hours of content", value: myCourses.reduce((s, c) => s + c.hours, 0), icon: ClockIcon },
        ];

        return (
          <>
            <WelcomeBanner id="overview" title={<>Welcome, {user.name.split(" ")[0] || "there"}!</>}>
              <p className="mt-3 text-sm leading-relaxed text-forest-100 sm:text-base">
                Manage your courses, students, live sessions and project reviews from here.
              </p>
            </WelcomeBanner>

            <StatTiles stats={stats} />

            <Card id="my-courses">
              <CardTitle title="My courses" />
              {myCourses.length ? (
                <div className="mt-5 space-y-4">
                  {myCourses.map((c) => (
                    <article
                      key={c.slug}
                      className="flex flex-col gap-4 rounded-2xl border border-forest-100 p-3 transition hover:shadow-lg hover:shadow-forest-900/5 sm:flex-row sm:items-center"
                    >
                      <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl sm:w-40">
                        <Image src={c.image} alt={c.title} fill sizes="(min-width: 640px) 160px, 100vw" className="object-cover" />
                      </div>
                      <div className="min-w-0 flex-1 px-1 sm:px-0">
                        <h3 className="font-semibold leading-snug text-forest-950">{c.title}</h3>
                        <p className="mt-0.5 text-sm text-slate-500">
                          {c.category} · {c.level} · {c.lessons} lessons · {c.hours} hrs
                        </p>
                      </div>
                      <Link
                        href={`/courses/${c.slug}`}
                        className="shrink-0 rounded-full border border-forest-200 px-5 py-2.5 text-center text-sm font-semibold text-forest-700 transition hover:bg-forest-50"
                      >
                        View page
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState icon={BookIcon} title="No courses linked to you yet">
                  Courses appear here when the mentor name on a course matches your profile name ({user.name}).
                </EmptyState>
              )}
            </Card>

            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              <Card id="students">
                <CardTitle title="Students" />
                <EmptyState icon={UsersIcon} title="No students enrolled yet" />
              </Card>
              <Card id="sessions">
                <CardTitle title="Upcoming live sessions" />
                <EmptyState icon={CalendarIcon} title="No sessions scheduled" />
              </Card>
              <Card id="reviews" className="lg:col-span-2 xl:col-span-1">
                <CardTitle title="Pending reviews" />
                <EmptyState icon={ClipboardIcon} title="Nothing to review" />
              </Card>
            </div>
          </>
        );
      }}
    </DashboardShell>
  );
}
