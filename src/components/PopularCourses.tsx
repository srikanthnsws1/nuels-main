"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import EnrollButton from "./EnrollButton";
import SectionHeading from "./SectionHeading";
import { BookIcon, ClockIcon, CloseIcon, SearchIcon } from "./icons";
import Reveal from "./motion/Reveal";
import { courseFilters } from "@/data/site";
import { courseHref, subjectGroups, syllabusFor, useCatalog, type CatalogCourse as Course } from "@/lib/catalog";

const rupee = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function CourseCard({ course }: { course: Course }) {
  return (
    <article id={course.slug} className="group flex h-full scroll-mt-28 flex-col overflow-hidden rounded-3xl border border-forest-100 bg-white p-3 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-forest-900/10">
      <div className="relative aspect-video overflow-hidden rounded-2xl">
        <Image
          src={course.image}
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
          <Link href={courseHref(course.slug)} className="transition hover:text-forest-600">
            {course.title}
          </Link>
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          by <span className="font-medium text-forest-600">{course.mentor}</span>
        </p>
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">{course.description}</p>
        <Link
          href={courseHref(course.slug)}
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
          {course.hours > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-50 px-3 py-1.5">
              <ClockIcon className="h-3.5 w-3.5 text-forest-600" />
              {course.hours} Hours
            </span>
          )}
        </div>

        <div className="flex-1 pt-5" />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-forest-100 pt-4">
          <div>
            <span className="text-xl font-bold text-forest-900">{rupee.format(course.price)}</span>
            <span className="ml-2 text-sm text-slate-400 line-through">{rupee.format(course.oldPrice)}</span>
          </div>
          <EnrollButton
            course={course}
            className="inline-flex items-center gap-1.5 rounded-full bg-forest-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-forest-600 disabled:opacity-70"
          >
            Enroll Now
          </EnrollButton>
        </div>
      </div>
    </article>
  );
}

/** One card for a school subject sold chapter by chapter; opens its chapter picker. */
function SubjectCard({ group, chapters }: { group: string; chapters: Course[] }) {
  const subject = subjectGroups[group];
  const from = Math.min(...chapters.map((c) => c.price));
  const was = Math.max(...chapters.map((c) => c.oldPrice));
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-forest-100 bg-white p-3 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-forest-900/10">
      <div className="relative aspect-video overflow-hidden rounded-2xl">
        <Image src={subject.image} alt={subject.title} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-500 group-hover:scale-105" />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-forest-700">School</span>
        <span className="absolute right-3 top-3 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">LIVE</span>
      </div>
      <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
        <h3 className="text-lg font-semibold leading-snug text-forest-950">
          <Link href={subject.href} className="transition hover:text-forest-600">
            {subject.title}
          </Link>
        </h3>
        <p className="mt-1 text-sm text-slate-500">Chapter-wise classes · pick only what you need</p>
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">{subject.description}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-50 px-3 py-1.5">
            <BookIcon className="h-3.5 w-3.5 text-forest-600" />
            {chapters.length} Chapters
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-50 px-3 py-1.5">
            <ClockIcon className="h-3.5 w-3.5 text-forest-600" />
            Live + recorded
          </span>
        </div>
        <div className="flex-1 pt-5" />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-forest-100 pt-4">
          <div>
            <span className="text-xl font-bold text-forest-900">{rupee.format(from)}</span>
            <span className="ml-2 text-sm text-slate-400 line-through">{rupee.format(was)}</span>
            <span className="block text-xs font-semibold text-forest-600">per chapter</span>
          </div>
          <Link
            href={subject.href}
            className="inline-flex items-center gap-1.5 rounded-full bg-forest-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-forest-600"
          >
            Choose chapters
          </Link>
        </div>
      </div>
    </article>
  );
}

/** Everything a learner might type to find a course: title, tools and topics, category, mentor, subject. */
function searchText(c: Course) {
  const subject = c.group ? subjectGroups[c.group] : undefined;
  return [c.title, c.description, c.category, c.level, c.mentor, subject?.title, subject?.short, ...syllabusFor(c).flatMap((m) => [m.title, ...m.topics])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** Every word typed must appear somewhere in the course ("python data", "power bi"). */
const matches = (c: Course, words: string[]) => {
  const text = searchText(c);
  return words.every((w) => text.includes(w));
};

export default function PopularCourses({ standalone = false }: { standalone?: boolean }) {
  const [active, setActive] = useState(courseFilters[0]);
  const [query, setQuery] = useState("");
  const courses = useCatalog();
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = (active === courseFilters[0] ? courses : courses.filter((c) => c.category === active)).filter((c) => !words.length || matches(c, words));
  // Chapters of a school subject show as one subject card, where the first chapter would be.
  const visible: ({ kind: "course"; course: Course } | { kind: "subject"; group: string; chapters: Course[] })[] = [];
  for (const c of filtered) {
    if (c.group && subjectGroups[c.group]) {
      if (!visible.some((v) => v.kind === "subject" && v.group === c.group)) {
        visible.push({ kind: "subject", group: c.group, chapters: filtered.filter((x) => x.group === c.group) });
      }
    } else visible.push({ kind: "course", course: c });
  }

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

        <div className={`mx-auto flex max-w-xl items-center gap-3 rounded-full border border-forest-100 bg-white px-5 py-3 shadow-sm transition focus-within:border-forest-300 focus-within:shadow-md ${standalone ? "" : "mt-10"}`}>
          <SearchIcon className="h-5 w-5 shrink-0 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses, tools or topics (e.g. Python, Power BI, AWS)"
            aria-label="Search courses"
            className="w-full min-w-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 sm:text-base [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-forest-50 hover:text-forest-700">
              <CloseIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-2 sm:justify-center">
          {courseFilters.map((f) => (
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

        {words.length > 0 && visible.length > 0 && (
          <p className="mt-6 text-center text-sm text-slate-500" aria-live="polite">
            {visible.length} {visible.length === 1 ? "result" : "results"} for &ldquo;{query.trim()}&rdquo;
            {active === courseFilters[0] ? "" : ` in ${active}`}
          </p>
        )}
        {words.length > 0 && visible.length === 0 && (
          <div className="mx-auto mt-6 max-w-md rounded-3xl border border-forest-100 bg-white p-8 text-center">
            <p className="font-semibold text-forest-950">No courses match &ldquo;{query.trim()}&rdquo;</p>
            <p className="mt-1 text-sm text-slate-500">Try another tool or topic{active === courseFilters[0] ? "" : `, or search all categories`}.</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActive(courseFilters[0]);
              }}
              className="mt-4 rounded-full bg-forest-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-600"
            >
              Show all courses
            </button>
          </div>
        )}

        <div className="mt-8 grid gap-5 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {visible.map((item, i) => (
            <Reveal key={`${active}-${query}-${item.kind === "course" ? item.course.slug : item.group}`} delay={(i % 3) * 120} className="h-full">
              {item.kind === "course" ? <CourseCard course={item.course} /> : <SubjectCard group={item.group} chapters={item.chapters} />}
            </Reveal>
          ))}
        </div>

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
    </section>
  );
}
