"use client";

import Image from "next/image";
import Link from "next/link";
import EnrollButton from "./EnrollButton";
import { ArrowRightIcon, BookIcon, BriefcaseIcon, CalendarIcon, CheckIcon, ClockIcon, GraduationIcon } from "./icons";
import { mentors } from "@/data/site";
import { useCourse } from "@/lib/catalog";

// Parts of a course page that admins can change at any time (price, mentor, level, lessons),
// read from the live catalog. The pre-rendered HTML shows the built-in values until it loads.

const rupee = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function CourseFacts({ slug }: { slug: string }) {
  const course = useCourse(slug);
  if (!course) return null;
  const facts = [
    { icon: BookIcon, label: `${course.lessons} lessons` },
    { icon: ClockIcon, label: `${course.hours} hours of content` },
    { icon: GraduationIcon, label: `${course.level} level` },
    { icon: CalendarIcon, label: "Weekly live sessions" },
  ];
  return (
    <ul className="mt-7 flex flex-wrap gap-2">
      {facts.map(({ icon: Icon, label }) => (
        <li key={label} className="inline-flex items-center gap-2 rounded-full border border-forest-100 bg-white px-4 py-2 text-sm font-medium text-forest-800 shadow-sm">
          <Icon className="h-4 w-4 text-forest-600" />
          {label}
        </li>
      ))}
    </ul>
  );
}

export function CourseMentor({ slug }: { slug: string }) {
  const course = useCourse(slug);
  if (!course?.mentor) return null;
  const mentor = mentors.find((m) => m.name === course.mentor);
  return (
    <div className="mt-7 flex items-center gap-3">
      {mentor ? (
        <Image src={mentor.image} alt={mentor.name} width={48} height={48} className="h-12 w-12 rounded-full border-2 border-white object-cover shadow-md" />
      ) : (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-forest-700 font-bold text-spark-400">{course.mentor[0]}</span>
      )}
      <div>
        <p className="text-sm text-slate-500">Taught by</p>
        <p className="font-semibold text-forest-950">
          {course.mentor} {mentor && <span className="font-normal text-slate-500">· {mentor.role}</span>}
        </p>
      </div>
    </div>
  );
}

export function CourseEnrollCard({ slug, priority = false }: { slug: string; priority?: boolean }) {
  const course = useCourse(slug);
  if (!course) return null;
  const discount = course.oldPrice > course.price ? Math.round((1 - course.price / course.oldPrice) * 100) : 0;
  return (
    <aside className="overflow-hidden rounded-3xl border border-forest-100 bg-white p-3 shadow-xl shadow-forest-900/10">
      <div className="relative aspect-video overflow-hidden rounded-2xl">
        <Image src={course.image} alt={`${course.title} course preview`} fill priority={priority} sizes="(min-width: 1024px) 400px, 100vw" className="object-cover" />
      </div>
      <div className="p-3 pt-5">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-3xl font-bold text-forest-950">{rupee.format(course.price)}</span>
          {discount > 0 && (
            <>
              <span className="text-slate-400 line-through">{rupee.format(course.oldPrice)}</span>
              <span className="rounded-full bg-spark-500/20 px-2.5 py-0.5 text-xs font-bold text-forest-800">{discount}% off</span>
            </>
          )}
        </div>
        <EnrollButton
          course={course}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-forest-700 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-forest-700/20 transition hover:bg-forest-600 disabled:opacity-70"
        >
          Enroll Now <ArrowRightIcon className="h-4 w-4" />
        </EnrollButton>
        <ul className="mt-5 space-y-2.5 text-sm text-slate-600">
          {["Lifetime access to lessons", "Mentor-reviewed projects", "Certificate of completion", "7-day refund policy"].map((t) => (
            <li key={t} className="flex items-center gap-2.5">
              <CheckIcon className="h-4 w-4 shrink-0 text-forest-600" />
              {t}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

/** Bio card for the course's mentor (only for mentors on the Mentors page). */
export function CourseMentorBio({ slug }: { slug: string }) {
  const course = useCourse(slug);
  const mentor = mentors.find((m) => m.name === course?.mentor);
  if (!mentor) return null;
  return (
    <section aria-labelledby="mentor" className="relative overflow-hidden rounded-3xl bg-forest-800 p-6 sm:p-8">
      <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-[radial-gradient(closest-side,var(--color-spark-500),transparent)] opacity-10" />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
        <Image src={mentor.image} alt={mentor.name} width={120} height={120} className="h-28 w-28 shrink-0 rounded-2xl object-cover" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-spark-400">Your mentor</p>
          <h2 id="mentor" className="mt-1 text-2xl font-bold text-white">
            {mentor.name}
          </h2>
          <p className="text-sm text-forest-100">{mentor.role}</p>
          <p className="mt-3 flex items-center gap-2 text-sm text-forest-100">
            <BriefcaseIcon className="h-4 w-4 text-spark-400" />
            {mentor.experience} experience · {mentor.company}
          </p>
          <Link href="/mentors" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-spark-400 hover:text-spark-300">
            Meet all mentors <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
