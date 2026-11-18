"use client";

import { greetingName, useAuth } from "@/lib/auth";
import { useMemberBadges } from "@/lib/badges";

import Image from "next/image";
import Link from "next/link";
import { BookIcon, CalendarIcon, ClipboardIcon, ClockIcon, GridIcon, InboxIcon, PlayIcon, TicketIcon, UsersIcon } from "../icons";
import DashboardShell, { type Section } from "./DashboardShell";
import InboxPage from "./Inbox";
import { AssignedTicketsPage, RequestsPage } from "./Requests";
import { Card, CardTitle, EmptyState, StatTiles, WelcomeBanner } from "./ui";
import { courseHref, useCatalog } from "@/lib/catalog";

const sections: Section[] = [
  { id: "overview", label: "Overview", icon: GridIcon },
  { id: "my-courses", label: "My Courses", icon: BookIcon },
  { id: "students", label: "Students", icon: UsersIcon },
  { id: "sessions", label: "Live Sessions", icon: CalendarIcon },
  { id: "reviews", label: "Reviews", icon: ClipboardIcon },
  { id: "inbox", label: "Inbox", icon: InboxIcon },
  { id: "requests", label: "Requests & Leave", icon: ClipboardIcon },
  { id: "assigned", label: "Assigned to me", icon: TicketIcon },
];

export default function MentorDashboard() {
  const courses = useCatalog();
  const { user: me } = useAuth();
  const badges = useMemberBadges(me);
  return (
    <DashboardShell role="mentor" sections={sections} paged badges={badges}>
      {(user, page) => {
        if (page === "inbox") return <InboxPage user={user} />;
        if (page === "requests") return <RequestsPage user={user} />;
        if (page === "assigned") return <AssignedTicketsPage user={user} />;
        // Courses are linked to a mentor by the name shown on the course page.
        const myCourses = courses.filter((c) => c.mentor === user.name);
        const stats = [
          { label: "Courses you teach", value: myCourses.length, icon: BookIcon },
          { label: "Lessons", value: myCourses.reduce((s, c) => s + c.lessons, 0), icon: PlayIcon },
          { label: "Hours of content", value: myCourses.reduce((s, c) => s + c.hours, 0), icon: ClockIcon },
        ];

        const overview = page === "overview";
        return (
          <>
            {overview && (
            <WelcomeBanner id="overview" title={<>Welcome, {greetingName(user)}!</>}>
              <p className="mt-3 text-sm leading-relaxed text-forest-100 sm:text-base">
                Manage your courses, students, live sessions and project reviews from here.
              </p>
            </WelcomeBanner>
            )}

            {overview && <StatTiles stats={stats} />}

            {(overview || page === "my-courses") && (
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
                        href={courseHref(c.slug)}
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
            )}

            {(overview || page === "students") && (
              <Card id="students">
                <CardTitle title="Students" />
                <EmptyState icon={UsersIcon} title="No students enrolled yet" />
              </Card>
            )}
            {(overview || page === "sessions") && (
              <Card id="sessions">
                <CardTitle title="Upcoming live sessions" />
                <EmptyState icon={CalendarIcon} title="No sessions scheduled" />
              </Card>
            )}
            {(overview || page === "reviews") && (
              <Card id="reviews">
                <CardTitle title="Pending reviews" />
                <EmptyState icon={ClipboardIcon} title="Nothing to review" />
              </Card>
            )}
          </>
        );
      }}
    </DashboardShell>
  );
}
