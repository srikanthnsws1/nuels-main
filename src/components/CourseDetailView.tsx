"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CourseEnrollCard, CourseFacts, CourseMentor, CourseMentorBio } from "./CourseLive";
import { CheckIcon } from "./icons";
import { syllabusFor, useCatalogLoaded, useCourse } from "@/lib/catalog";

/** /courses/view?c={slug}: the page for courses added from the admin panel. */
export default function CourseDetailView() {
  const slug = useSearchParams().get("c") ?? "";
  const course = useCourse(slug);
  const loaded = useCatalogLoaded();
  const syllabus = syllabusFor(course);

  if (!course || course.hidden) {
    return (
      <section className="px-4 pb-20 pt-32 text-center sm:pt-40">
        {!course && !loaded ? (
          <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-forest-100 border-t-forest-700" aria-label="Loading" />
        ) : (
          <>
            <h1 className="text-3xl font-bold text-forest-950">Course not available</h1>
            <p className="mt-2 text-slate-600">This course may have been removed or isn&apos;t open for enrollment yet.</p>
            <Link href="/courses" className="mt-6 inline-block rounded-full bg-forest-700 px-6 py-3 text-sm font-semibold text-white">
              Browse courses
            </Link>
          </>
        )}
      </section>
    );
  }

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-forest-50 via-white to-white pb-12 pt-28 sm:pt-36 lg:pb-16 lg:pt-44">
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_400px] lg:items-start lg:px-8">
          <div>
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <Link href="/" className="hover:text-forest-700">
                Home
              </Link>
              <span className="h-1 w-1 rounded-full bg-spark-500" />
              <Link href="/courses" className="hover:text-forest-700">
                Courses
              </Link>
              <span className="h-1 w-1 rounded-full bg-spark-500" />
              <span className="font-medium text-forest-700">{course.category}</span>
            </nav>
            <h1 className="mt-5 text-[2rem] font-bold leading-tight tracking-tight text-forest-950 sm:text-5xl">{course.title}</h1>
            {course.description && <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">{course.description}</p>}
            <CourseFacts slug={slug} />
            <CourseMentor slug={slug} />
          </div>
          <div className="lg:sticky lg:top-28">
            <CourseEnrollCard slug={slug} priority />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="max-w-3xl space-y-12 lg:max-w-[calc(100%-440px)]">
          {syllabus.length > 0 && (
            <section aria-labelledby="syllabus">
              <h2 id="syllabus" className="text-2xl font-bold tracking-tight text-forest-950 sm:text-3xl">
                Course syllabus
              </h2>
              <ol className="mt-6 space-y-3">
                {syllabus.map((m, i) => (
                  <li key={i} className="rounded-2xl border border-forest-100 bg-white p-5">
                    <p className="font-semibold text-forest-950">
                      Module {i + 1}: {m.title}
                    </p>
                    <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                      {m.topics.map((t) => (
                        <li key={t} className="flex items-center gap-2">
                          <CheckIcon className="h-3.5 w-3.5 shrink-0 text-forest-600" />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </section>
          )}
          <CourseMentorBio slug={slug} />
        </div>
      </div>
    </>
  );
}
