"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";
import EnrollModal from "./EnrollModal";
import MentorBadge from "./MentorBadge";
import SectionHeading from "./SectionHeading";
import { BookIcon, ClockIcon } from "./icons";
import Reveal from "./motion/Reveal";
import { courseImage, coursePath, rupee, useCourses, type Course } from "@/lib/courses";

const ALL = "All Courses";

function CourseCard({ course, onEnroll }: { course: Course; onEnroll: () => void }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-forest-100 bg-white p-3 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-forest-900/10">
      <div className="relative aspect-video overflow-hidden rounded-2xl">
        <Image
          src={courseImage(course)}
          alt={course.title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-forest-700">
          {course.category}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-forest-700 px-3 py-1 text-xs font-semibold text-spark-400">
          {course.level}
        </span>
      </div>

      <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
        <h3 className="text-lg font-semibold leading-snug text-forest-950">
          <Link href={coursePath(course.id)} className="transition hover:text-forest-600">
            {course.title}
          </Link>
        </h3>
        <div className="mt-3">
          <MentorBadge course={course} />
        </div>
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">{course.description}</p>
        <Link
          href={coursePath(course.id)}
          className="mt-1 self-start py-1.5 text-sm font-semibold text-forest-700 hover:text-forest-500"
          aria-label={`View ${course.title} course details`}
        >
          View course details →
        </Link>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-50 px-3 py-1.5">
            <BookIcon className="h-3.5 w-3.5 text-forest-600" />
            {course.lessons} Lessons
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-50 px-3 py-1.5">
            <ClockIcon className="h-3.5 w-3.5 text-forest-600" />
            {course.hours} Hours
          </span>
        </div>

        <div className="flex-1 pt-5" />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-forest-100 pt-4">
          <div>
            <span className="text-xl font-bold text-forest-900">{course.price ? rupee.format(course.price) : "Free"}</span>
            {course.oldPrice ? <span className="ml-2 text-sm text-slate-400 line-through">{rupee.format(course.oldPrice)}</span> : null}
          </div>
          <button
            type="button"
            onClick={onEnroll}
            className="rounded-full bg-forest-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-forest-600"
          >
            Enroll Now
          </button>
        </div>
      </div>
    </article>
  );
}

export default function PopularCourses({ standalone = false }: { standalone?: boolean }) {
  const { courses, error } = useCourses();
  const [active, setActive] = useState(ALL);
  const [enrolling, setEnrolling] = useState<Course | null>(null);
  const closeEnroll = useCallback(() => setEnrolling(null), []);

  // Filters show only the categories that currently have courses.
  const filters = [ALL, ...new Set((courses ?? []).map((c) => c.category))];
  const matching = active === ALL ? courses ?? [] : (courses ?? []).filter((c) => c.category === active);
  const visible = standalone ? matching : matching.slice(0, 6);

  return (
    <section id="courses" className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {!standalone && (
          <SectionHeading
            eyebrow="Courses"
            title="Explore Most Popular Courses"
            subtitle="Learn from top-rated mentors across our most loved categories and start growing your skills today."
          />
        )}

        {filters.length > 2 && (
          <div className={`no-scrollbar flex gap-2 overflow-x-auto pb-2 sm:justify-center ${standalone ? "" : "mt-10"}`}>
            {filters.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setActive(f)}
                className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                  active === f
                    ? "bg-forest-700 text-white shadow-lg shadow-forest-700/20"
                    : "border border-forest-100 bg-white text-slate-600 hover:border-forest-300 hover:text-forest-700"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        {error ? (
          <p className="mt-10 text-center text-sm font-medium text-red-600">{error}</p>
        ) : courses === null ? (
          <div className="mt-8 grid gap-5 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-96 animate-pulse rounded-3xl bg-forest-50" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="mt-10 flex flex-col items-center rounded-3xl border border-dashed border-forest-200 px-6 py-14 text-center">
            <BookIcon className="h-8 w-8 text-forest-600" />
            <p className="mt-3 font-semibold text-forest-950">New courses are on the way</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">Our mentors are preparing their courses. Check back soon.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {visible.map((course, i) => (
              <Reveal key={`${active}-${course.id}`} delay={(i % 3) * 120} className="h-full">
                <CourseCard course={course} onEnroll={() => setEnrolling(course)} />
              </Reveal>
            ))}
          </div>
        )}

        {!standalone && (
          <div className="mt-12 text-center">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 rounded-full border-2 border-forest-700 px-6 py-3 text-sm font-semibold text-forest-700 transition hover:bg-forest-700 hover:text-white"
            >
              View All Courses
            </Link>
          </div>
        )}
      </div>
      {enrolling && <EnrollModal course={enrolling} onClose={closeEnroll} />}
    </section>
  );
}
