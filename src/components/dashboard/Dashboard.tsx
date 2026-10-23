"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import EnrollButton from "../EnrollButton";
import MentorBadge from "../MentorBadge";
import { ArrowRightIcon, BookIcon, CalendarIcon, ClockIcon, GraduationIcon, GridIcon, LockIcon, PlayIcon, SparkIcon } from "../icons";
import DashboardShell, { type Section } from "./DashboardShell";
import ProfilePhotoCard from "./ProfilePhotoCard";
import { Card, CardTitle, EmptyState, StatTiles, WelcomeBanner } from "./ui";
import { contactInfo } from "@/data/site";
import { greetingName, type AppUser } from "@/lib/auth";
import {
  byTopic,
  courseImage,
  coursePath,
  enrollmentStatusLabel,
  localDate,
  rupee,
  sessionWhen,
  useCourses,
  useRecordings,
  useStudentEnrollments,
  useUpcomingSessions,
  youtubeEmbedUrl,
  type Course,
  type Enrollment,
  type LiveSession,
} from "@/lib/courses";

const sections: Section[] = [
  { id: "overview", label: "Overview", icon: GridIcon },
  { id: "schedule", label: "Live Sessions", icon: CalendarIcon },
  { id: "recordings", label: "Recorded Classes", icon: PlayIcon },
  { id: "my-courses", label: "My Courses", icon: BookIcon },
  { id: "explore", label: "Explore", icon: SparkIcon },
  { id: "photo", label: "Profile", icon: GraduationIcon },
];

const sidebarCard = (
  <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
    <SparkIcon className="h-6 w-6 text-spark-400" />
    <p className="mt-3 font-semibold text-white">Explore more courses</p>
    <p className="mt-1 text-xs leading-relaxed text-forest-100">Our mentors add new courses regularly.</p>
    <Link
      href="/courses"
      className="mt-4 inline-flex items-center gap-2 rounded-full bg-spark-500 px-4 py-2 text-xs font-bold text-forest-900 transition hover:bg-spark-400"
    >
      Browse courses <ArrowRightIcon className="h-3.5 w-3.5" />
    </Link>
  </div>
);

function JoinButton({ session, className = "" }: { session: LiveSession; className?: string }) {
  return (
    <a
      href={session.meetLink}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-forest-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-600 ${className}`}
    >
      <PlayIcon className="h-4 w-4" /> Join Google Meet
    </a>
  );
}

/** Shown when a student opens a course whose payment hasn't been verified yet. */
function LockedNotice({ enrollment, course }: { enrollment: Enrollment; course?: Course }) {
  return (
    <div role="alert" className="mt-3 rounded-2xl bg-spark-500/15 p-4 text-sm leading-relaxed text-forest-900">
      <p className="flex items-center gap-2 font-semibold">
        <LockIcon className="h-4 w-4" />
        {enrollment.status === "rejected" ? "We couldn't verify your payment" : "This course is locked until your payment is verified"}
      </p>
      <p className="mt-1">
        Please contact the administration department to gain full access to the course:{" "}
        <a href={contactInfo.phones[0].href} className="font-semibold text-forest-700 hover:underline">
          {contactInfo.phones[0].display}
        </a>{" "}
        ·{" "}
        <a href={`mailto:${contactInfo.email}`} className="font-semibold text-forest-700 hover:underline">
          {contactInfo.email}
        </a>
        {enrollment.studentMemberId && (
          <>
            {" "}
            (mention your Student ID <span className="font-mono font-semibold">{enrollment.studentMemberId}</span>)
          </>
        )}
        .
      </p>
      {enrollment.status === "rejected" && course && (
        <EnrollButton course={course} className="mt-3 rounded-full bg-forest-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-forest-600">
          Upload a new payment screenshot
        </EnrollButton>
      )}
    </div>
  );
}

/** YouTube recordings of the student's unlocked courses, grouped by topic, played in the page. */
function RecordedClasses({ courses }: { courses: Course[] }) {
  const [courseId, setCourseId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const selected = courses.find((c) => c.id === courseId) ?? courses[0];
  const recordings = useRecordings(selected?.id ?? null);
  const current = recordings?.find((r) => r.id === playingId) ?? recordings?.[0] ?? null;
  const topics = byTopic(recordings ?? []);

  return (
    <Card id="recordings">
      <CardTitle title="Recorded classes" />
      {courses.length === 0 ? (
        <EmptyState icon={PlayIcon} title="No recordings available yet">
          Recordings of your classes appear here once you&apos;re enrolled and your payment is verified.
        </EmptyState>
      ) : (
        <>
          {courses.length > 1 && (
            <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto">
              {courses.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCourseId(c.id);
                    setPlayingId(null);
                  }}
                  aria-pressed={c.id === selected?.id}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    c.id === selected?.id ? "bg-forest-700 text-white" : "border border-forest-100 text-slate-600 hover:bg-forest-50"
                  }`}
                >
                  {c.title}
                </button>
              ))}
            </div>
          )}

          {recordings === null ? (
            <p className="mt-6 text-sm text-slate-500">Loading recordings…</p>
          ) : !current ? (
            <EmptyState icon={PlayIcon} title="No recordings posted yet">
              Your mentor hasn&apos;t added recordings for {selected?.title} yet.
            </EmptyState>
          ) : (
            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0">
                <div className="relative aspect-video overflow-hidden rounded-2xl bg-forest-950">
                  <iframe
                    key={current.id}
                    src={youtubeEmbedUrl(current.videoId)}
                    title={current.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full"
                  />
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-forest-600">{current.topic}</p>
                <h3 className="mt-1 text-lg font-bold text-forest-950">{current.title}</h3>
                {selected && (
                  <div className="mt-3">
                    <MentorBadge course={selected} />
                  </div>
                )}
              </div>
              <div data-lenis-prevent className="max-h-[28rem] space-y-4 overflow-y-auto pr-1">
                {topics.map((t) => (
                  <div key={t.topic}>
                    <p className="text-sm font-semibold text-forest-950">{t.topic}</p>
                    <ul className="mt-2 space-y-1.5">
                      {t.recordings.map((r) => (
                        <li key={r.id}>
                          <button
                            type="button"
                            onClick={() => setPlayingId(r.id)}
                            aria-current={r.id === current.id ? "true" : undefined}
                            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition ${
                              r.id === current.id ? "bg-forest-700 font-semibold text-white" : "text-slate-700 hover:bg-forest-50"
                            }`}
                          >
                            <PlayIcon className={`h-4 w-4 shrink-0 ${r.id === current.id ? "text-spark-400" : "text-forest-600"}`} />
                            <span className="min-w-0 flex-1">{r.title}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function StudentContent({ user }: { user: AppUser }) {
  const enrollments = useStudentEnrollments(user.uid);
  const { courses } = useCourses();
  const [openLocked, setOpenLocked] = useState<string | null>(null);
  // Live-session links are only for courses whose payment the admin has approved.
  const approved = (enrollments ?? []).filter((e) => e.status === "approved");
  const upcoming = useUpcomingSessions(approved.map((e) => e.courseId));
  const { sessions } = upcoming;
  const loaded = enrollments !== null && upcoming.loaded;
  const pending = (enrollments ?? []).filter((e) => e.status === "pending");

  const today = localDate();
  const todays = sessions.filter((s) => s.date === today);
  const enrolledIds = new Set((enrollments ?? []).map((e) => e.courseId));
  const courseById = new Map((courses ?? []).map((c) => [c.id, c]));
  const explore = (courses ?? []).filter((c) => !enrolledIds.has(c.id)).slice(0, 3);

  const stats = [
    { label: "Active courses", value: enrollments ? approved.length : "—", icon: BookIcon },
    { label: "Awaiting payment check", value: enrollments ? pending.length : "—", icon: LockIcon },
    { label: "Sessions today", value: loaded ? todays.length : "—", icon: PlayIcon },
    { label: "Upcoming sessions", value: loaded ? sessions.length : "—", icon: CalendarIcon },
  ];

  return (
    <>
      <WelcomeBanner id="overview" title={<>Welcome, {greetingName(user)}! 👋</>}>
        {todays[0] ? (
          <>
            <p className="mt-3 text-sm leading-relaxed text-forest-100 sm:text-base">
              Your next live session: <strong className="text-white">{todays[0].topic}</strong> ({todays[0].courseTitle}),{" "}
              {sessionWhen(todays[0])}.
            </p>
            <a
              href={todays[0].meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-spark-500 px-6 py-3 text-sm font-bold text-forest-900 shadow-lg shadow-spark-500/30 transition hover:bg-spark-400"
            >
              Join on Google Meet <ArrowRightIcon className="h-4 w-4" />
            </a>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm leading-relaxed text-forest-100 sm:text-base">
              {pending.length
                ? `Your payment for ${pending.length === 1 ? pending[0].courseTitle : `${pending.length} courses`} is being verified by our administration team. The course unlocks as soon as it's approved.`
                : enrollments?.length
                  ? "Your mentors' Google Meet links for live sessions will show up here as soon as they post them."
                  : "Enroll in a course and your mentor's daily live-session links will show up here."}
            </p>
            <Link
              href="/courses"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-spark-500 px-6 py-3 text-sm font-bold text-forest-900 shadow-lg shadow-spark-500/30 transition hover:bg-spark-400"
            >
              Browse courses <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </>
        )}
      </WelcomeBanner>

      <StatTiles stats={stats} />

      <Card id="schedule">
        <CardTitle title="Live sessions" />
        {!loaded ? (
          <p className="mt-6 text-sm text-slate-500">Loading sessions…</p>
        ) : sessions.length === 0 ? (
          <EmptyState icon={CalendarIcon} title="No sessions scheduled yet">
            {approved.length || !pending.length
              ? "When your mentor posts today's Google Meet link, it appears here instantly."
              : "Live-session links appear once the administration team verifies your payment."}
          </EmptyState>
        ) : (
          <ul className="mt-5 space-y-3">
            {sessions.map((s) => (
              <li
                key={s.id}
                className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center ${
                  s.date === today ? "border-spark-500 bg-spark-500/10" : "border-forest-100"
                }`}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-forest-700 text-spark-400">
                  <CalendarIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-forest-950">{s.topic}</p>
                  <p className="text-sm text-slate-500">
                    {s.courseTitle} · with {s.mentorName}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-forest-700">
                    <ClockIcon className="h-3.5 w-3.5" /> {sessionWhen(s)}
                  </p>
                </div>
                <JoinButton session={s} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <RecordedClasses courses={approved.map((e) => courseById.get(e.courseId)).filter((c): c is Course => !!c)} />

      <Card id="my-courses">
        <CardTitle title="My courses" />
        {enrollments === null ? (
          <p className="mt-6 text-sm text-slate-500">Loading your courses…</p>
        ) : enrollments.length === 0 ? (
          <EmptyState icon={BookIcon} title="You haven't enrolled in a course yet">
            Pick a course from the catalog to get started.
          </EmptyState>
        ) : (
          <div className="mt-5 space-y-4">
            {enrollments.map((e) => {
              const course = courseById.get(e.courseId);
              const locked = e.status !== "approved";
              return (
                <article key={e.id} className={`rounded-2xl border p-3 ${locked ? "border-forest-100 bg-forest-50/40" : "border-forest-100"}`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-forest-50 sm:w-40">
                      {course && (
                        <Image
                          src={courseImage(course)}
                          alt={course.title}
                          fill
                          sizes="(min-width: 640px) 160px, 100vw"
                          className={`object-cover ${locked ? "opacity-60 grayscale" : ""}`}
                        />
                      )}
                      {locked && (
                        <span className="absolute inset-0 flex items-center justify-center" aria-label="Locked">
                          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-forest-900/80 text-spark-400">
                            <LockIcon className="h-5 w-5" />
                          </span>
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 px-1 sm:px-0">
                      <h3 className="flex flex-wrap items-center gap-2 font-semibold leading-snug text-forest-950">
                        {locked && <LockIcon className="h-4 w-4 shrink-0 text-forest-700" />}
                        {course?.title ?? e.courseTitle}
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            e.status === "approved"
                              ? "bg-forest-100 text-forest-800"
                              : e.status === "rejected"
                                ? "bg-red-50 text-red-700"
                                : "bg-spark-500/25 text-forest-800"
                          }`}
                        >
                          {enrollmentStatusLabel[e.status]}
                        </span>
                      </h3>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {course
                          ? `${course.level} · ${course.lessons} lessons · ${course.hours} hrs`
                          : courses === null
                            ? "Loading…"
                            : "This course is no longer available."}
                      </p>
                      {course && (
                        <div className="mt-2">
                          <MentorBadge course={course} />
                        </div>
                      )}
                    </div>
                    {locked ? (
                      <button
                        type="button"
                        onClick={() => setOpenLocked((id) => (id === e.id ? null : e.id))}
                        aria-expanded={openLocked === e.id}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-forest-200 px-5 py-2.5 text-sm font-semibold text-forest-700 transition hover:bg-forest-50"
                      >
                        <LockIcon className="h-4 w-4" /> Open course
                      </button>
                    ) : (
                      course && (
                        <Link
                          href={coursePath(course.id)}
                          className="shrink-0 rounded-full border border-forest-200 px-5 py-2.5 text-center text-sm font-semibold text-forest-700 transition hover:bg-forest-50"
                        >
                          View course
                        </Link>
                      )
                    )}
                  </div>
                  {locked && openLocked === e.id && <LockedNotice enrollment={e} course={course} />}
                </article>
              );
            })}
          </div>
        )}
      </Card>

      <Card id="explore">
        <CardTitle
          title="Explore courses"
          action={
            <Link href="/courses" className="-my-2 py-2 text-sm font-semibold text-forest-600 hover:text-forest-500">
              Browse all
            </Link>
          }
        />
        {courses !== null && explore.length === 0 ? (
          <EmptyState icon={SparkIcon} title="You're enrolled in every course we have">
            New courses from our mentors will show up here.
          </EmptyState>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {explore.map((c) => (
              <Link
                key={c.id}
                href={coursePath(c.id)}
                className="group overflow-hidden rounded-2xl border border-forest-100 p-2 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-forest-900/10"
              >
                <div className="relative aspect-video overflow-hidden rounded-xl">
                  <Image
                    src={courseImage(c)}
                    alt={c.title}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-2 pt-3">
                  <p className="text-xs font-medium text-forest-600">
                    {c.level} · {c.mentorName}
                  </p>
                  <p className="mt-1 font-semibold leading-snug text-forest-950">{c.title}</p>
                  <p className="mt-1 text-sm font-bold text-forest-700">{c.price ? rupee.format(c.price) : "Free"}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
      <ProfilePhotoCard user={user} />
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
